import { describe, expect, it } from "vitest";
import { Script, Transaction, UnlockingScript } from "@bsv/sdk";
import { reviewDraft, reviewChangeOutputs } from "../src/client/wallet/payment";
function fixture() {
  const source = new Transaction();
  source.addOutput({ satoshis: 1000, lockingScript: Script.fromHex("51") });
  const tx = new Transaction();
  tx.addInput({
    sourceTransaction: source,
    sourceOutputIndex: 0,
    unlockingScript: UnlockingScript.fromHex(""),
  });
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
    expect(() => reviewDraft(fixture(), "52", 100, 109)).toThrow(/exceeding/);
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
  it("binds every non-payment output to the exact unsigned transaction and rejects unknown change", () => {
    const tx = fixture();
    const change = `${tx.id("hex")}.1`;
    expect(() => reviewChangeOutputs(tx, 0, [change])).not.toThrow();
    for (const invalid of [
      undefined,
      [],
      [change, change],
      ["a".repeat(64) + ".1"],
      [`${tx.id("hex")}.0`],
    ]) {
      expect(() => reviewChangeOutputs(tx, 0, invalid)).toThrow(
        /cannot verify/,
      );
    }
  });
});
