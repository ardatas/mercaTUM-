import { mkdir, chmod } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import type {
  ChainTracker,
  WalletInterface,
  Transaction as BsvTransaction,
} from "@bsv/sdk" with { "resolution-mode": "require" };
const {
  CachedKeyDeriver,
  MerklePath,
  P2PKH,
  PrivateKey,
  PublicKey,
  Transaction,
  ScriptEvaluationError,
} = createRequire(import.meta.url)("@bsv/sdk") as typeof import("@bsv/sdk", {
  with: { "resolution-mode": "require" },
});
import {
  Monitor,
  Services,
  Setup,
  StorageKnex,
  Wallet,
  WalletStorageManager,
} from "@bsv/wallet-toolbox";
import {
  AppError,
  type Network,
  type PaymentProof,
  type Quote,
  type ArcadeObservation,
} from "../../shared/contracts.js";

export const NETWORKS = {
  mainnet: {
    chain: "main" as const,
    arcade: "https://arcade-v2-us-1.bsvblockchain.tech",
    explorer: "https://whatsonchain.com/tx/",
  },
  testnet: {
    chain: "test" as const,
    arcade: "https://arcade-v2-testnet-us-1.bsvblockchain.tech",
    explorer: "https://test.whatsonchain.com/tx/",
  },
};
export const BRC29_PROTOCOL: [2, string] = [2, "3241645161d8"];
const accepted = new Set([
  "ACCEPTED_BY_NETWORK",
  "SEEN_ON_NETWORK",
  "SEEN_MULTIPLE_NODES",
  "MINED",
  "IMMUTABLE",
]);
export const rejectedStatus = (status: string) =>
  /REJECTED|DOUBLE_SPEND|ORPHAN|INVALID/.test(status);
export interface Merchant {
  identityKey: string;
  verify(
    proof: PaymentProof,
    quote: Quote,
  ): Promise<{ txid: string; ef: string; feeSats: number }>;
  submit(txid: string, ef: string): Promise<ArcadeObservation>;
  observe(
    txid: string,
    previous: ArcadeObservation,
  ): Promise<ArcadeObservation>;
  internalize(proof: PaymentProof): Promise<void>;
  close(): Promise<void>;
}

/** Check claims against the immutable quote before invoking any external wallet action. */
export async function verifyRemittance(
  wallet: WalletInterface,
  tracker: ChainTracker,
  proof: PaymentProof,
  quote: Quote,
) {
  if (
    proof.derivationPrefix !== quote.derivationPrefix ||
    proof.senderIdentityKey !== quote.payerIdentityKey ||
    proof.satoshis !== quote.priceSats
  )
    throw new AppError(
      "PAYMENT_MISMATCH",
      "Payment does not match this quote.",
    );
  let tx: BsvTransaction;
  try {
    tx = Transaction.fromAtomicBEEF(proof.tx);
  } catch {
    throw new AppError(
      "PAYMENT_MISMATCH",
      "The transaction proof cannot be parsed.",
    );
  }
  const txid = tx.id("hex");
  if (txid !== proof.txid)
    throw new AppError(
      "PAYMENT_MISMATCH",
      "Transaction ID does not match its bytes.",
    );
  const { publicKey } = await wallet.getPublicKey({
    protocolID: BRC29_PROTOCOL,
    keyID: `${proof.derivationPrefix} ${proof.derivationSuffix}`,
    counterparty: proof.senderIdentityKey,
    forSelf: true,
  });
  const script = new P2PKH()
    .lock(PublicKey.fromString(publicKey).toAddress())
    .toHex();
  const output = tx.outputs[proof.outputIndex];
  if (
    !output ||
    output.satoshis !== quote.priceSats ||
    output.lockingScript.toHex() !== script
  )
    throw new AppError(
      "PAYMENT_MISMATCH",
      "The selected output does not pay the quoted recipient and amount.",
    );
  try {
    if (!(await tx.verify(tracker)))
      throw new AppError(
        "PAYMENT_MISMATCH",
        "Transaction scripts or ancestry failed verification.",
      );
  } catch (error) {
    if (error instanceof ScriptEvaluationError)
      throw new AppError(
        "PAYMENT_MISMATCH",
        "Transaction scripts failed verification.",
      );
    throw error; // Unavailable trusted headers are reconciliation, not proof of invalidity.
  }
  // EF requires every direct source output, even when a proof could otherwise be pruned.
  for (const input of tx.inputs) {
    if (
      !input.sourceTransaction ||
      (input.sourceTXID &&
        input.sourceTransaction.id("hex") !== input.sourceTXID)
    )
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "Complete source transactions are required for Arcade submission.",
        202,
        true,
      );
  }
  const inputSats = tx.inputs.reduce(
    (sum, input) =>
      sum +
      (input.sourceTransaction!.outputs[input.sourceOutputIndex]?.satoshis ??
        NaN),
    0,
  );
  const outputSats = tx.outputs.reduce(
    (sum, output) => sum + (output.satoshis ?? NaN),
    0,
  );
  const feeSats = inputSats - outputSats;
  if (
    !Number.isSafeInteger(inputSats) ||
    !Number.isSafeInteger(outputSats) ||
    !Number.isSafeInteger(feeSats) ||
    feeSats < 0
  )
    throw new AppError("PAYMENT_MISMATCH", "Transaction amounts are invalid.");
  return { txid, ef: tx.toHexEF(), feeSats };
}

export class ToolboxMerchant implements Merchant {
  private constructor(
    readonly identityKey: string,
    private wallet: Wallet,
    private services: Services,
    private arcade: NonNullable<Services["arcade"]>,
    private tracker: ChainTracker,
    private monitor: Monitor,
  ) {}
  static async create(network: Network, rootKeyHex: string, directory: string) {
    if (!/^[a-fA-F0-9]{64}$/.test(rootKeyHex))
      throw new Error("Invalid provider wallet configuration.");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const { chain, arcade: arcadeUrl } = NETWORKS[network];
    const root = PrivateKey.fromHex(rootKeyHex);
    const identityKey = root.toPublicKey().toString();
    const options = Services.createDefaultOptions(chain);
    options.arcadeUrl = arcadeUrl;
    const services = new Services(options);
    const path = join(directory, `provider-${network}.sqlite`);
    const storage = new StorageKnex({
      ...StorageKnex.createStorageBaseOptions(chain),
      knex: Setup.createSQLiteKnex(path),
    });
    try {
      await storage.migrate("mercatum-provider", identityKey);
      await storage.makeAvailable();
      await chmod(path, 0o600);
      const manager = new WalletStorageManager(identityKey, storage);
      await manager.makeAvailable();
      manager.setServices(services);
      const monitor = new Monitor(
        Monitor.createDefaultWalletMonitorOptions(chain, manager, services),
      );
      monitor.addDefaultTasks();
      const wallet = new Wallet({
        chain,
        keyDeriver: new CachedKeyDeriver(root),
        storage: manager,
        services,
        monitor,
      });
      const tracker = await services.getChainTracker();
      const merchant = new ToolboxMerchant(
        identityKey,
        wallet,
        services,
        services.arcade!,
        tracker,
        monitor,
      );
      void monitor.startTasks().catch(() => {
        /* Next reconciliation remains fail closed. */
      });
      return merchant;
    } catch (error) {
      await storage.destroy();
      throw error;
    }
  }
  verify(proof: PaymentProof, quote: Quote) {
    return verifyRemittance(this.wallet, this.tracker, proof, quote);
  }
  async submit(txid: string, ef: string): Promise<ArcadeObservation> {
    const result = await this.arcade.postRawTx(ef, [txid]);
    if (result.txid !== txid)
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "Arcade returned a different transaction identifier.",
        202,
        true,
      );
    // Only a successful POST is counted as Arcade evidence; GET/header access cannot substitute.
    if (result.status !== "success")
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "Arcade submission needs reconciliation.",
        202,
        true,
      );
    const raw =
      typeof result.data === "string" ? result.data.split(" ")[0] : "SUBMITTED";
    return {
      submittedAt: new Date().toISOString(),
      postStatus: raw,
      status: raw,
      networkKnown: false,
    };
  }
  async observe(
    txid: string,
    previous: ArcadeObservation,
  ): Promise<ArcadeObservation> {
    const data = await this.arcade.getTxData(txid); // pinned provider validates txid and response shape
    let networkKnown = accepted.has(data.txStatus);
    if (data.txStatus === "MINED" || data.txStatus === "IMMUTABLE") {
      if (!data.merklePath || !data.blockHash) networkKnown = false;
      else {
        const proof = MerklePath.fromHex(data.merklePath);
        const header = await this.services.hashToHeader(data.blockHash);
        networkKnown =
          !!header &&
          header.height === proof.blockHeight &&
          header.merkleRoot === proof.computeRoot(txid) &&
          (await this.tracker.isValidRootForHeight(
            proof.computeRoot(txid),
            proof.blockHeight,
          ));
      }
    }
    return { ...previous, status: data.txStatus, networkKnown };
  }
  async internalize(proof: PaymentProof) {
    // The pinned Toolbox merge path is idempotent for an existing managed outpoint;
    // repeating exactly these bytes reconciles a crash after wallet commit, before app commit.
    await this.wallet.internalizeAction({
      tx: proof.tx,
      outputs: [
        {
          outputIndex: proof.outputIndex,
          protocol: "wallet payment",
          paymentRemittance: {
            derivationPrefix: proof.derivationPrefix,
            derivationSuffix: proof.derivationSuffix,
            senderIdentityKey: proof.senderIdentityKey,
          },
        },
      ],
      description: "Mercatum service payment",
    });
  }
  async close() {
    this.monitor.stopTasks();
    await this.monitor.destroy();
    await this.wallet.destroy();
  }
}
