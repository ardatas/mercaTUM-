import { describe, expect, it } from "vitest";
import { paymentRecoveryMessage } from "../src/client/wallet/recovery-status";
import type { PublicTask } from "../src/shared/contracts";
const attempt: NonNullable<PublicTask["attempt"]> = {
  id: "attempt",
  taskId: "task",
  quoteId: "quote",
  state: "PAYMENT_UNKNOWN",
  createdAt: "2026-10-31T00:00:00Z",
  approval: {
    approved: true,
    feePolicy: "review-before-sign",
    maxAuthorizedDebitSats: 1000,
  },
};
describe("actionable payment recovery status", () => {
  it("distinguishes an unused approval from a possibly started wallet call", () => {
    expect(
      paymentRecoveryMessage({ ...attempt, state: "APPROVED" }, () => null),
    ).toContain("has not started");
    expect(
      paymentRecoveryMessage(attempt, () =>
        JSON.stringify({ phase: "wallet_requested" }),
      ),
    ).toContain("automatic recovery is unavailable");
  });
  it("does not describe missing or corrupt evidence as a cancellation", () => {
    expect(paymentRecoveryMessage(attempt, () => null)).toContain(
      "cannot safely assume",
    );
    expect(paymentRecoveryMessage(attempt, () => "broken")).toContain(
      "cannot safely be reset",
    );
  });
  it("explains lost signatures and saved proof without promising another payment", () => {
    expect(
      paymentRecoveryMessage(attempt, () =>
        JSON.stringify({ phase: "sign_requested" }),
      ),
    ).toContain("No new signature");
    expect(
      paymentRecoveryMessage(attempt, () =>
        JSON.stringify({ phase: "proof_received" }),
      ),
    ).toContain("same proof");
  });
  it("shows a concrete server verification error ahead of browser recovery guidance", () => {
    expect(
      paymentRecoveryMessage(
        { ...attempt, state: "VERIFYING", error: "Chain service unavailable" },
        () => null,
      ),
    ).toBe("Chain service unavailable");
  });
});
