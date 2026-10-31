import { describe, expect, it } from "vitest";
import { Script, Transaction, type WalletActionOutput } from "@bsv/sdk";
import { reviewDraft, reviewChangeOutputs } from "../src/client/wallet/payment";
function fixture() {
  const source = new Transaction();
  source.addOutput({ satoshis: 1000, lockingScript: Script.fromHex("51") });
  const tx = new Transaction();
  tx.addInput({ sourceTransaction: source, sourceOutputIndex: 0 });
  tx.addOutput({ satoshis: 100, lockingScript: Script.fromHex("52") });
  tx.addOutput({ satoshis: 890, lockingScript: Script.fromHex("51") });
  return tx;
}
describe("unsigned fee bounds", () => {
  it("computes actual fee and exact authorized total", () => {
    expect(reviewDraft(fixture(), "52", 100, 110)).toEqual({
      feeSats: 10,
      totalDebitSats: 110,
      outputIndex: 0,
    });
    expect(() => reviewDraft(fixture(), "52", 100, 109)).toThrow(/exceeds/);
  });
  it("blocks missing and forged source bytes, duplicate inputs and duplicate payment outputs", () => {
    let tx = fixture();
    delete tx.inputs[0].sourceTransaction;
    expect(() => reviewDraft(tx, "52", 100, 1000)).toThrow(/parent/);
    tx = fixture();
    tx.inputs[0].sourceTXID = "a".repeat(64);
    expect(() => reviewDraft(tx, "52", 100, 1000)).toThrow(/parent/);
    tx = fixture();
    tx.inputs.push({ ...tx.inputs[0] });
    expect(() => reviewDraft(tx, "52", 100, 1000)).toThrow(/repeats/);
    tx = fixture();
    tx.outputs[1].lockingScript = Script.fromHex("52");
    expect(() => reviewDraft(tx, "52", 100, 1000)).toThrow(/exactly one/);
  });
});

describe("wallet-authored change ownership metadata", () => {
  const output = (
    outputIndex: number,
    satoshis: number,
    basket: string,
    lockingScript: string,
  ): WalletActionOutput => ({
    outputIndex,
    satoshis,
    basket,
    lockingScript,
    spendable: true,
    tags: [],
    outputDescription: "",
  });
  const wallet = (
    outputs: WalletActionOutput[],
    reference = "reference 010203",
  ) => ({
    listActions: async () => ({
      totalActions: 1,
      actions: [
        {
          txid: "",
          satoshis: -110,
          status: "unsigned" as const,
          isOutgoing: true,
          description: "Payment draft",
          version: 1,
          lockTime: 0,
          labels: ["mercatum-attempt", reference],
          outputs,
        },
      ],
    }),
  });
  it("accepts reference-bound default change and blocks external/unknown outputs before signing", async () => {
    const valid = [output(0, 100, "", "52"), output(1, 890, "default", "")];
    await expect(
      reviewChangeOutputs(wallet(valid), fixture(), 0, "attempt", "AQID"),
    ).resolves.toBeUndefined();
    await expect(
      reviewChangeOutputs(
        wallet([valid[0], output(1, 890, "commission", "51")]),
        fixture(),
        0,
        "attempt",
        "AQID",
      ),
    ).rejects.toThrow(/unrequested output/);
    await expect(
      reviewChangeOutputs(
        wallet(valid, "reference 999999"),
        fixture(),
        0,
        "attempt",
        "AQID",
      ),
    ).rejects.toThrow(/cannot identify/);
    await expect(
      reviewChangeOutputs(wallet([valid[0]]), fixture(), 0, "attempt", "AQID"),
    ).rejects.toThrow(/cannot identify/);
  });
});
