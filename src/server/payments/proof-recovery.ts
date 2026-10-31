import { createRequire } from "node:module";
import type { MerklePath, Transaction as BsvTransaction } from "@bsv/sdk" with {
  "resolution-mode": "require",
};
const { Beef, Transaction } = createRequire(import.meta.url)(
  "@bsv/sdk",
) as typeof import("@bsv/sdk", { with: { "resolution-mode": "require" } });
import { AppError, type PaymentProof } from "../../shared/contracts.js";

export type AncestorLoader = (
  txid: string,
) => Promise<{ rawTx?: number[]; merklePath?: MerklePath }>;

/** Wallet history supplies signatures but an unsigned draft may lack ancestor
 * proofs. Recover only hash-bound ancestry; the ordinary SPV verifier still
 * decides validity. Never fetch the payment itself or change its signed bytes. */
export async function hydratePaymentProof(
  proof: PaymentProof,
  load: AncestorLoader,
): Promise<PaymentProof> {
  const envelope = Beef.fromBinary(proof.tx);
  const root = Transaction.fromAtomicBEEF(proof.tx);
  if (root.id("hex") !== proof.txid)
    throw new AppError(
      "PAYMENT_MISMATCH",
      "Transaction ID does not match its bytes.",
    );
  const complete = (id: string, visiting = new Set<string>()): boolean => {
    if (visiting.has(id) || visiting.size >= 64) return false;
    const entry = envelope.findTxid(id);
    if (!entry?.tx) return false;
    if (entry.hasProof) return true;
    visiting.add(id);
    const result =
      entry.tx.inputs.length > 0 &&
      entry.tx.inputs.every(
        (i) => !!i.sourceTXID && complete(i.sourceTXID, visiting),
      );
    visiting.delete(id);
    return result;
  };
  if (root.inputs.every((i) => !!i.sourceTXID && complete(i.sourceTXID)))
    return proof;
  const deadline = Date.now() + 30_000;
  const visited = new Set<string>();
  let bytes = proof.tx.length;
  const recover = async (id: string): Promise<void> => {
    if (complete(id)) return;
    if (visited.has(id) || visited.size >= 32 || Date.now() >= deadline)
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "Ancestor recovery reached its limit. Keep this payment for reconciliation; do not pay again.",
        202,
        true,
      );
    visited.add(id);
    let ancestor: Awaited<ReturnType<AncestorLoader>>;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      ancestor = await Promise.race([
        load(id),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("ancestor timeout")),
            Math.max(1, deadline - Date.now()),
          );
        }),
      ]);
    } catch {
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "The signed payment is saved, but its blockchain ancestry is unavailable. Check payment again when the chain service responds.",
        202,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
    let tx: BsvTransaction | undefined = envelope.findTxid(id)?.tx;
    if (ancestor.rawTx) {
      bytes += ancestor.rawTx.length;
      if (bytes > 2_000_000)
        throw new AppError(
          "PAYMENT_UNKNOWN",
          "Recovered payment evidence exceeds the supported size.",
          202,
          true,
        );
      tx = Transaction.fromBinary(ancestor.rawTx);
      if (tx.id("hex") !== id)
        throw new AppError(
          "PAYMENT_MISMATCH",
          "The chain service returned a different ancestor transaction.",
        );
      envelope.mergeRawTx(ancestor.rawTx);
    }
    if (!tx)
      throw new AppError(
        "PAYMENT_UNKNOWN",
        "The chain service did not return the required ancestor transaction.",
        202,
        true,
      );
    if (ancestor.merklePath) {
      // computeRoot binds the supplied path to this exact ancestor; trusted
      // headers are checked later by verifyRemittance's ChainTracker.
      ancestor.merklePath.computeRoot(id);
      envelope.mergeRawTx(
        tx.toBinary(),
        envelope.mergeBump(ancestor.merklePath),
      );
    } else {
      if (!tx.inputs.length)
        throw new AppError(
          "PAYMENT_UNKNOWN",
          "Ancestor evidence has no confirmed proof.",
          202,
          true,
        );
      for (const input of tx.inputs) {
        if (!input.sourceTXID)
          throw new AppError(
            "PAYMENT_UNKNOWN",
            "Ancestor evidence is incomplete.",
            202,
            true,
          );
        await recover(input.sourceTXID);
      }
    }
  };
  for (const input of root.inputs) await recover(input.sourceTXID!);
  const tx = envelope.toBinaryAtomic(proof.txid);
  if (tx.length > 2_000_000)
    throw new AppError(
      "PAYMENT_UNKNOWN",
      "Recovered payment evidence exceeds the supported size.",
      202,
      true,
    );
  return { ...proof, tx };
}
