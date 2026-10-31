import {
  Beef,
  P2PKH,
  PublicKey,
  Random,
  Transaction,
  UnlockingScript,
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
async function walletRead<T>(
  operation: Promise<T>,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AppError("WALLET_UNAVAILABLE", message)),
          30_000,
        );
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "No wallet available over any communication substrate",
      )
    ) {
      throw new AppError(
        "WALLET_UNAVAILABLE",
        "Cannot reach your BSV wallet. Open and unlock BSV Desktop, allow this site's local-app access in your browser, then click Connect wallet again. No transaction was started by this connection check.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function connectWallet(
  wallet: WalletInterface = new WalletClient("auto"),
): Promise<WalletConnection> {
  const [{ network }, { publicKey: identityKey }] = await walletRead(
    (async () => {
      await wallet.waitForAuthentication({});
      return Promise.all([
        wallet.getNetwork({}),
        wallet.getPublicKey({ identityKey: true }),
      ]);
    })(),
    "The wallet did not respond within 30 seconds. Unlock the original wallet and try again; no new transaction was started by this connection check.",
  );
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
/** The standard noSendChange result binds wallet-managed change to this exact
 * unsigned transaction. No history/admin-basket query is needed before signing. */
export function reviewChangeOutputs(
  tx: Transaction,
  paymentIndex: number,
  noSendChange: string[] | undefined,
) {
  const change = new Set(noSendChange || []);
  const expected = tx.outputs
    .map((_, index) => `${tx.id("hex")}.${index}`)
    .filter((_, index) => index !== paymentIndex);
  if (
    change.size !== (noSendChange || []).length ||
    change.size !== expected.length ||
    expected.some((outpoint) => !change.has(outpoint))
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
  if (!stillUnsigned() || tx.inputs.length === 0) return;
  let aborted = false;
  let refused = false;
  try {
    const result = await wallet.abortAction({ reference: saved.reference });
    aborted = result.aborted === true;
    refused = !aborted;
  } catch {
    // Older clients saved the unsigned draft but not the successful abort.
    // Recover ONLY the mathematically over-limit branch: reviewDraft throws
    // before signAction, and the durable phase is written before any signing.
    // Do not request admin-only wallet baskets or bypass SDK history validation.
    if (
      feeSats === undefined ||
      quote.priceSats + feeSats <= maxAuthorizedDebitSats
    )
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "The wallet did not confirm cancellation of this unsigned draft. Unlock the original wallet and check again; no replacement payment was started.",
      );
  }
  // A positive refusal is never overridden by an over-limit draft calculation.
  if (refused)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The wallet refused to cancel this draft. Inspect the original action in your wallet; this attempt must remain unresolved.",
    );
  if (!stillUnsigned()) return;
  const rejection: UnsignedAbort = {
    quoteId: quote.id,
    reference: saved.reference,
    aborted,
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

/** Recover an existing signature via standard wallet history. Never sign, create,
 * abort signed actions, query privileged baskets, or accept history as a receipt. */
export async function recoverSignedPayment(options: {
  quote: Omit<Quote, "ownerId" | "fingerprint" | "configurationDigest">;
  attemptId: string;
  maxAuthorizedDebitSats: number;
  wallet?: WalletInterface;
  storage?: PaymentStorage;
}): Promise<PaymentProof | undefined> {
  const { quote, attemptId, maxAuthorizedDebitSats } = options;
  const storage = options.storage || localStorage;
  const existing = savedPaymentProof(attemptId, storage);
  if (existing) return existing;
  let saved;
  try {
    saved = JSON.parse(storage.getItem(storageKey(attemptId)) || "null");
  } catch {
    return;
  }
  if (saved?.phase !== "sign_requested") return;
  if (
    saved.quoteId !== quote.id ||
    !Array.isArray(saved.draft) ||
    typeof saved.derivationSuffix !== "string" ||
    !saved.derivationSuffix
  )
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The signing record is incomplete. Recover the original payment in the original browser and wallet; it cannot be reset.",
    );
  const wallet = options.wallet || new WalletClient("auto");
  const connected = await connectWallet(wallet);
  if (
    connected.network !== quote.network ||
    connected.identityKey !== quote.payerIdentityKey
  )
    throw new AppError(
      "PAYMENT_MISMATCH",
      "Reconnect the original buyer wallet and network to recover this payment.",
    );
  const { publicKey } = await wallet.getPublicKey({
    protocolID,
    keyID: `${quote.derivationPrefix} ${saved.derivationSuffix}`,
    counterparty: quote.recipientIdentityKey,
    forSelf: false,
  });
  const script = new P2PKH()
    .lock(PublicKey.fromString(publicKey).toAddress())
    .toHex();
  const unsigned = Transaction.fromAtomicBEEF(saved.draft);
  const reviewed = reviewDraft(
    unsigned,
    script,
    quote.priceSats,
    maxAuthorizedDebitSats,
  );
  const label = `mercatum-${attemptId}`;
  let history;
  try {
    history = await walletRead(
      wallet.listActions({
        labels: [label],
        labelQueryMode: "all",
        includeLabels: true,
        includeInputs: true,
        includeInputUnlockingScripts: true,
        includeOutputs: true,
        includeOutputLockingScripts: true,
        limit: 100,
      }),
      "Wallet history did not respond within 30 seconds.",
    );
  } catch {
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The wallet could not return transaction history. Unlock the original wallet and allow history access, then check again. No new payment was started.",
    );
  }
  if (history.totalActions > history.actions.length)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The wallet returned incomplete history for this attempt. Manual recovery of the original transaction is required.",
    );
  const matches = new Map<string, PaymentProof>();
  for (const action of history.actions) {
    if (
      !action.labels?.includes(label) ||
      !action.isOutgoing ||
      !["nosend", "completed", "unproven", "sending", "unprocessed"].includes(
        action.status,
      ) ||
      action.version !== unsigned.version ||
      action.lockTime !== unsigned.lockTime ||
      action.inputs?.length !== unsigned.inputs.length ||
      action.outputs?.length !== unsigned.outputs.length
    )
      continue;
    const inputs = action.inputs;
    const outputs = action.outputs;
    if (
      !inputs ||
      !outputs ||
      inputs.some((input, i) => {
        const expected = unsigned.inputs[i];
        return (
          input.sourceOutpoint !==
            `${expected.sourceTXID || expected.sourceTransaction?.id("hex")}.${expected.sourceOutputIndex}` ||
          input.sequenceNumber !== expected.sequence ||
          !input.unlockingScript
        );
      })
    )
      continue;
    if (
      new Set(outputs.map((o) => o.outputIndex)).size !==
        unsigned.outputs.length ||
      outputs.some((output) => {
        const expected = unsigned.outputs[output.outputIndex];
        return (
          !expected ||
          expected.satoshis !== output.satoshis ||
          expected.lockingScript.toHex() !== output.lockingScript
        );
      })
    )
      continue;
    try {
      // Retain the complete, previously reviewed ancestry; use only signatures
      // from history. Recompute the ID, never trust a history status or label alone.
      const signed = Transaction.fromAtomicBEEF(saved.draft);
      signed.inputs.forEach((input, i) => {
        input.unlockingScript = UnlockingScript.fromHex(
          inputs[i].unlockingScript!,
        );
      });
      if (signed.id("hex") !== action.txid) continue;
      const envelope = Beef.fromBinary(saved.draft);
      envelope.removeExistingTxid(unsigned.id("hex"));
      envelope.mergeRawTx(signed.toBinary());
      const proof = proofSchema.parse({
        tx: envelope.toBinaryAtomic(action.txid),
        txid: action.txid,
        outputIndex: reviewed.outputIndex,
        satoshis: quote.priceSats,
        derivationPrefix: quote.derivationPrefix,
        derivationSuffix: saved.derivationSuffix,
        senderIdentityKey: connected.identityKey,
      });
      matches.set(action.txid, proof);
    } catch {
      /* An incomplete or inconsistent action is not usable evidence. */
    }
  }
  if (matches.size !== 1)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      matches.size > 1
        ? "More than one signed transaction matches this attempt. Manual reconciliation is required; no replacement payment is allowed."
        : "No complete signed transaction matching this attempt was found in wallet history. If a wallet prompt is still open, finish or dismiss it and check again. Otherwise recover the original transaction manually; this is not confirmation of cancellation.",
    );
  const proof = [...matches.values()][0];
  // A concurrently returned original response must never be overwritten by a different proof.
  const current = JSON.parse(storage.getItem(storageKey(attemptId)) || "null");
  if (current?.proof) {
    const prior = proofSchema.parse(current.proof);
    if (prior.txid !== proof.txid)
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "The saved proof changed during recovery. Manual reconciliation is required.",
      );
    return prior;
  }
  if (
    current?.phase !== "sign_requested" ||
    current.reference !== saved.reference ||
    current.quoteId !== saved.quoteId
  )
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "The payment record changed during recovery. Check the current attempt again.",
    );
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({ phase: "proof_received", proof }),
  );
  return proof;
}

export function clearPaymentProof(
  attemptId: string,
  storage: PaymentStorage = localStorage,
) {
  storage.removeItem(storageKey(attemptId));
}
/** The caller either owns the one-time claim already (legacy integrations), or
 * supplies claimWallet. Browser callers claim only after non-spending preparation. */
export async function payApprovedQuote(options: {
  quote: Omit<Quote, "ownerId" | "fingerprint" | "configurationDigest">;
  attemptId: string;
  maxAuthorizedDebitSats: number;
  wallet?: WalletInterface;
  storage?: PaymentStorage;
  onProof?: (proof: PaymentProof) => void | Promise<void>;
  onReview?: (review: { feeSats: number; totalDebitSats: number }) => void;
  claimWallet?: () => Promise<boolean>;
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
  // Test durable browser storage before acquiring the one-time server claim.
  // A connection, identity, derivation or storage failure here cannot start a debit.
  storage.setItem(
    storageKey(attemptId),
    JSON.stringify({
      phase: "prepared",
      derivationSuffix,
      quoteId: quote.id,
    }),
  );
  if (options.claimWallet && !(await options.claimWallet()))
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "This attempt was already claimed or released. Check its existing status.",
    );
  // From this point even a lost createAction response must remain unresolved.
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
      noSend: true,
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
    reviewChangeOutputs(unsigned, reviewed.outputIndex, created.noSendChange);
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
  // Native human approval signs the fixed draft without broadcasting. The server
  // verifies and submits these same signed bytes through Arcade; a timeout here
  // remains ambiguous and can never authorize a replacement payment.
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
