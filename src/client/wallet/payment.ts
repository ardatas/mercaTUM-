import {
  P2PKH,
  PublicKey,
  Random,
  Transaction,
  Utils,
  WalletClient,
  type WalletInterface,
} from "@bsv/sdk";
import {
  AppError,
  proofSchema,
  unsignedAbortSchema,
  type UnsignedAbort,
  type Network,
  type PaymentProof,
  type Quote,
} from "../../shared/contracts";
const protocolID: [2, string] = [2, "3241645161d8"];
const storageKey = (attemptId: string) => `mercatum:payment:${attemptId}`;
export interface PaymentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface WalletConnection {
  wallet: WalletInterface;
  identityKey: string;
  network: Network;
}
export async function connectWallet(
  wallet: WalletInterface = new WalletClient("auto"),
): Promise<WalletConnection> {
  await wallet.waitForAuthentication({});
  const [{ network }, { publicKey: identityKey }] = await Promise.all([
    wallet.getNetwork({}),
    wallet.getPublicKey({ identityKey: true }),
  ]);
  if (network !== "mainnet" && network !== "testnet")
    throw new AppError(
      "WALLET_NETWORK_MISMATCH",
      "Use a mainnet or testnet BSV wallet.",
    );
  return { wallet, identityKey, network };
}
function safeSats(value: number | undefined): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The wallet did not supply valid source amounts.",
    );
  return value;
}
/** Compute the fee from complete, transaction-ID-bound parent outputs, never a UI estimate. */
export function reviewDraft(
  tx: Transaction,
  expectedScript: string,
  priceSats: number,
  maxAuthorizedDebitSats: number,
) {
  if (
    !Number.isSafeInteger(maxAuthorizedDebitSats) ||
    maxAuthorizedDebitSats < priceSats ||
    tx.inputs.length === 0
  )
    throw new AppError(
      "INVALID_INPUT",
      "The authorized debit cannot cover this payment.",
    );
  const seen = new Set<string>();
  const inputTotal = tx.inputs.reduce((sum, input) => {
    const parent = input.sourceTransaction;
    if (!parent || (input.sourceTXID && parent.id("hex") !== input.sourceTXID))
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "Complete parent transactions are required before signing.",
      );
    const outpoint = `${parent.id("hex")}.${input.sourceOutputIndex}`;
    if (seen.has(outpoint))
      throw new AppError(
        "PAYMENT_MISMATCH",
        "The wallet draft repeats an input.",
      );
    seen.add(outpoint);
    return safeSats(
      sum + safeSats(parent.outputs[input.sourceOutputIndex]?.satoshis),
    );
  }, 0);
  const outputTotal = tx.outputs.reduce(
    (sum, output) => safeSats(sum + safeSats(output.satoshis)),
    0,
  );
  const feeSats = inputTotal - outputTotal;
  const matching = tx.outputs
    .map((output, index) => ({ output, index }))
    .filter(({ output }) => output.lockingScript.toHex() === expectedScript);
  if (matching.length !== 1 || matching[0].output.satoshis !== priceSats)
    throw new AppError(
      "PAYMENT_MISMATCH",
      "The draft must contain exactly one payment for the quoted amount.",
    );
  if (
    !Number.isSafeInteger(feeSats) ||
    feeSats < 0 ||
    priceSats + feeSats > maxAuthorizedDebitSats
  )
    throw new AppError(
      "DEBIT_LIMIT_EXCEEDED",
      `The service price (${priceSats} sats) plus actual network fee (${feeSats} sats) totals ${priceSats + feeSats} sats, exceeding your approved maximum of ${maxAuthorizedDebitSats} sats. The draft was not signed.`,
    );
  return {
    feeSats,
    totalDebitSats: priceSats + feeSats,
    outputIndex: matching[0].index,
  };
}
/** Change ownership is wallet metadata. The pinned Toolbox does not expose unsigned
 * change scripts yet, so bind metadata to its BRC-153 reference plus output index/value.
 * Require the standard wallet to identify every
 * other output as its spendable default-basket change; reject commissions or unknown outputs. */
export async function reviewChangeOutputs(
  wallet: Pick<WalletInterface, "listActions">,
  tx: Transaction,
  paymentIndex: number,
  attemptId: string,
  reference: string,
) {
  const label = `mercatum-${attemptId}`;
  const history = await wallet.listActions({
    labels: [label],
    labelQueryMode: "all",
    includeLabels: true,
    includeOutputs: true,
    includeOutputLockingScripts: true,
    limit: 10,
  });
  const referenceLabel = `reference ${Utils.toHex(Utils.toArray(reference, "base64"))}`;
  const candidates = history.actions.filter(
    (action) =>
      action.labels?.includes(referenceLabel) &&
      action.labels?.includes(label) &&
      action.outputs?.length === tx.outputs.length &&
      action.outputs.every((output) => {
        const actual = tx.outputs[output.outputIndex];
        return (
          actual &&
          actual.satoshis === output.satoshis &&
          (actual.lockingScript.toHex() === output.lockingScript ||
            (output.outputIndex !== paymentIndex &&
              output.lockingScript === "" &&
              output.basket === "default" &&
              output.spendable))
        );
      }),
  );
  if (candidates.length !== 1)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The wallet cannot identify all outputs of the unsigned draft. Signing is blocked.",
    );
  const outputs = candidates[0].outputs!;
  if (
    new Set(outputs.map((o) => o.outputIndex)).size !== tx.outputs.length ||
    outputs.some(
      (output) =>
        output.outputIndex !== paymentIndex &&
        (!output.spendable || output.basket !== "default"),
    )
  )
    throw new AppError(
      "PAYMENT_MISMATCH",
      "The wallet draft includes an unrequested output or cannot verify its own change. Signing is blocked.",
    );
}
function template(tx: Transaction) {
  return JSON.stringify({
    version: tx.version,
    lockTime: tx.lockTime,
    inputs: tx.inputs.map((i) => ({
      txid: i.sourceTXID || i.sourceTransaction?.id("hex"),
      vout: i.sourceOutputIndex,
      sequence: i.sequence,
    })),
    outputs: tx.outputs.map((o) => ({
      satoshis: o.satoshis,
      script: o.lockingScript.toHex(),
    })),
  });
}
export function savedPaymentProof(
  attemptId: string,
  storage: PaymentStorage = localStorage,
): PaymentProof | undefined {
  const value = storage.getItem(storageKey(attemptId));
  if (!value) return;
  try {
    const saved = JSON.parse(value);
    if (saved.proof) return proofSchema.parse(saved.proof);
  } catch {
    /* Keep corrupt record for manual recovery, never replace the payment. */
  }
}
export function savedUnsignedAbort(
  attemptId: string,
  storage: PaymentStorage = localStorage,
): UnsignedAbort | undefined {
  try {
    const saved = JSON.parse(storage.getItem(storageKey(attemptId)) || "null");
    if (saved?.phase === "unsigned_aborted")
      return unsignedAbortSchema.parse(saved.rejection);
  } catch {
    /* Corrupt evidence must not unlock a retry. */
  }
}

/** Recover only a saved pre-sign draft, including drafts aborted by older clients.
 * Never abort/release a sign_requested record, even if a wallet abort would succeed. */
export async function recoverUnsignedDraft(options: {
  quote: Omit<Quote, "ownerId" | "fingerprint" | "configurationDigest">;
  attemptId: string;
  maxAuthorizedDebitSats: number;
  wallet?: WalletInterface;
  storage?: PaymentStorage;
}): Promise<UnsignedAbort | undefined> {
  const { quote, attemptId, maxAuthorizedDebitSats } = options;
  const storage = options.storage || localStorage;
  const confirmed = savedUnsignedAbort(attemptId, storage);
  if (confirmed) return confirmed.quoteId === quote.id ? confirmed : undefined;
  let saved;
  try {
    saved = JSON.parse(storage.getItem(storageKey(attemptId)) || "null");
  } catch {
    return;
  }
  if (
    saved?.phase !== "draft" ||
    saved.quoteId !== quote.id ||
    typeof saved.reference !== "string" ||
    !Array.isArray(saved.draft)
  )
    return;
  const wallet = options.wallet || new WalletClient("auto");
  const connected = await connectWallet(wallet);
  if (
    connected.network !== quote.network ||
    connected.identityKey !== quote.payerIdentityKey
  )
    throw new AppError(
      "PAYMENT_MISMATCH",
      "Reconnect the original buyer wallet and network to recover this draft.",
    );
  const tx = Transaction.fromAtomicBEEF(saved.draft);
  // Our ordinary payment has no custom signed inputs. Do not classify signed bytes as unsigned.
  if (tx.inputs.some((input) => input.unlockingScript?.toHex())) return;
  const stillUnsigned = () => {
    try {
      const current = JSON.parse(
        storage.getItem(storageKey(attemptId)) || "null",
      );
      return (
        current?.phase === "draft" && current.reference === saved.reference
      );
    } catch {
      return false;
    }
  };
  if (!stillUnsigned() || tx.inputs.length === 0) return;
  try {
    const result = await wallet.abortAction({ reference: saved.reference });
    if (result.aborted !== true) return;
  } catch {
    // The pinned wallet refuses to abort an already-aborted reference, and the
    // SDK cannot decode that failed-history row's empty txid. Keep validation
    // intact: instead prove every original input was released back to this wallet.
    // This fallback is NEVER allowed for a sign_requested local record.
    const available = await wallet.listOutputs({
      basket: "default",
      limit: 10000,
    });
    if (!stillUnsigned()) return;
    const unique = new Set<string>();
    for (const input of tx.inputs) {
      const parent = input.sourceTransaction;
      if (
        !parent ||
        (input.sourceTXID && parent.id("hex") !== input.sourceTXID)
      )
        return;
      const outpoint = `${parent.id("hex")}.${input.sourceOutputIndex}`;
      if (unique.has(outpoint)) return;
      unique.add(outpoint);
      const source = parent.outputs[input.sourceOutputIndex];
      if (
        !source ||
        !available.outputs.some(
          (output) =>
            output.outpoint === outpoint &&
            output.spendable === true &&
            output.satoshis === source.satoshis,
        )
      )
        return;
    }
  }
  let feeSats: number | undefined;
  try {
    const { publicKey } = await wallet.getPublicKey({
      protocolID,
      keyID: `${quote.derivationPrefix} ${saved.derivationSuffix}`,
      counterparty: quote.recipientIdentityKey,
      forSelf: false,
    });
    const script = new P2PKH()
      .lock(PublicKey.fromString(publicKey).toAddress())
      .toHex();
    feeSats = reviewDraft(
      tx,
      script,
      quote.priceSats,
      Number.MAX_SAFE_INTEGER,
    ).feeSats;
  } catch {
    /* Cancellation is proven even when the draft cannot be reviewed. */
  }
  if (!stillUnsigned()) return;
  const rejection: UnsignedAbort = {
    quoteId: quote.id,
    reference: saved.reference,
    aborted: true,
    code:
      feeSats !== undefined &&
      quote.priceSats + feeSats > maxAuthorizedDebitSats
        ? "DEBIT_LIMIT_EXCEEDED"
        : "DRAFT_REJECTED",
    ...(feeSats !== undefined ? { feeSats } : {}),
  };
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({ ...saved, phase: "unsigned_aborted", rejection }),
  );
  return rejection;
}

export function clearPaymentProof(
  attemptId: string,
  storage: PaymentStorage = localStorage,
) {
  storage.removeItem(storageKey(attemptId));
}
/** Caller must have just received invokeWallet:true from the one-time server claim. */
export async function payApprovedQuote(options: {
  quote: Omit<Quote, "ownerId" | "fingerprint" | "configurationDigest">;
  attemptId: string;
  maxAuthorizedDebitSats: number;
  wallet?: WalletInterface;
  storage?: PaymentStorage;
  onProof?: (proof: PaymentProof) => void | Promise<void>;
  onReview?: (review: { feeSats: number; totalDebitSats: number }) => void;
}): Promise<PaymentProof> {
  const { quote, attemptId, maxAuthorizedDebitSats } = options;
  const wallet = options.wallet || new WalletClient("auto");
  const storage = options.storage || localStorage;
  const previous = storage.getItem(storageKey(attemptId));
  if (previous) {
    const proof = savedPaymentProof(attemptId, storage);
    if (proof) return proof;
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "A wallet call was already started. Reconcile that attempt; do not pay again.",
    );
  }
  const { identityKey, network } = await connectWallet(wallet);
  if (network !== quote.network)
    throw new AppError(
      "WALLET_NETWORK_MISMATCH",
      "Switch your wallet to the quoted network before spending.",
    );
  if (
    identityKey !== quote.payerIdentityKey ||
    identityKey === quote.recipientIdentityKey
  )
    throw new AppError(
      "PAYMENT_MISMATCH",
      "Connect the buyer wallet associated with this quote.",
    );
  const derivationSuffix = Utils.toBase64(Random(16));
  const { publicKey } = await wallet.getPublicKey({
    protocolID,
    keyID: `${quote.derivationPrefix} ${derivationSuffix}`,
    counterparty: quote.recipientIdentityKey,
    forSelf: false,
  });
  const script = new P2PKH()
    .lock(PublicKey.fromString(publicKey).toAddress())
    .toHex();
  // Storage failure happens before createAction. A claim is never reusable after an uncertain call.
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({
      phase: "wallet_requested",
      derivationSuffix,
      quoteId: quote.id,
    }),
  );
  const created = await wallet.createAction({
    description: `Mercatum ${attemptId.slice(0, 8)}`,
    labels: [`mercatum-${attemptId}`],
    outputs: [
      {
        lockingScript: script,
        satoshis: quote.priceSats,
        outputDescription: "Approved fixed service price",
      },
    ],
    options: {
      signAndProcess: false,
      randomizeOutputs: false,
      acceptDelayedBroadcast: false,
      returnTXIDOnly: false,
      knownTxids: [],
    },
  });
  const draft = created.signableTransaction;
  if (!draft || created.txid || created.tx)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "This wallet did not provide a reviewable unsigned draft. Reconcile its history before any new payment.",
    );
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({
      phase: "draft",
      reference: draft.reference,
      draft: draft.tx,
      derivationSuffix,
      quoteId: quote.id,
    }),
  );
  let reviewed: ReturnType<typeof reviewDraft>;
  let unsigned: Transaction;
  try {
    unsigned = Transaction.fromAtomicBEEF(draft.tx);
    reviewed = reviewDraft(
      unsigned,
      script,
      quote.priceSats,
      maxAuthorizedDebitSats,
    );
    await reviewChangeOutputs(
      wallet,
      unsigned,
      reviewed.outputIndex,
      attemptId,
      draft.reference,
    );
    if (draft.tx.length + unsigned.inputs.length * 110 > 2_000_000)
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "This wallet proof exceeds the accepted proof size. The draft was not signed.",
      );
  } catch (error) {
    // This only releases an unsigned draft. Failure remains uncertain and cannot mint a new claim.
    try {
      const result = await wallet.abortAction({ reference: draft.reference });
      if (result.aborted === true) {
        let feeSats: number | undefined;
        try {
          feeSats = reviewDraft(
            Transaction.fromAtomicBEEF(draft.tx),
            script,
            quote.priceSats,
            Number.MAX_SAFE_INTEGER,
          ).feeSats;
        } catch {
          /* Invalid draft: no fee estimate. */
        }
        const rejection: UnsignedAbort = {
          quoteId: quote.id,
          reference: draft.reference,
          aborted: true,
          code:
            error instanceof AppError && error.code === "DEBIT_LIMIT_EXCEEDED"
              ? "DEBIT_LIMIT_EXCEEDED"
              : "DRAFT_REJECTED",
          ...(feeSats !== undefined ? { feeSats } : {}),
        };
        storage.setItem(
          storageKey(attemptId),
          JSON.stringify({ phase: "unsigned_aborted", rejection }),
        );
      }
    } catch {
      /* reconcile manually */
    }
    throw error;
  }
  options.onReview?.(reviewed);
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({
      phase: "sign_requested",
      reference: draft.reference,
      draft: draft.tx,
      derivationSuffix,
      quoteId: quote.id,
      reviewed,
      proofSpaceReservation: " ".repeat(unsigned.inputs.length * 1200 + 10000),
    }),
  );
  // The native wallet is controlled by the human, never UI automation. Its reviewed draft is fixed.
  const signed = await wallet.signAction({
    reference: draft.reference,
    spends: {},
    options: { acceptDelayedBroadcast: false, returnTXIDOnly: false },
  });
  if (!signed.tx || !signed.txid)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The wallet response is incomplete. Reconcile the existing transaction before any further debit.",
    );
  // Persist returned bytes immediately, even if final template validation subsequently fails.
  const proof: PaymentProof = {
    tx: Array.from(signed.tx),
    txid: signed.txid,
    outputIndex: reviewed.outputIndex,
    satoshis: quote.priceSats,
    derivationPrefix: quote.derivationPrefix,
    derivationSuffix,
    senderIdentityKey: identityKey,
  };
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({ phase: "proof_received", proof }),
  );
  const complete = Transaction.fromAtomicBEEF(proof.tx);
  if (
    template(complete) !== template(unsigned) ||
    complete.id("hex") !== proof.txid
  )
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "Signed transaction differs from the reviewed draft. Saved proof requires reconciliation.",
    );
  reviewDraft(complete, script, quote.priceSats, maxAuthorizedDebitSats);
  await options.onProof?.(proof);
  return proof;
}
