import type { PublicTask } from "../../shared/contracts";

/** Non-secret progress only; never return draft bytes, derivation data or proof. */
export function paymentRecoveryMessage(
  attempt: NonNullable<PublicTask["attempt"]>,
  read: (key: string) => string | null = (key) => localStorage.getItem(key),
): string {
  if (attempt.state === "APPROVED")
    return "The wallet transaction has not started. Check payment to release this unused approval and return to quote review.";
  if (
    attempt.arcade ||
    attempt.state === "PROOF_RECEIVED" ||
    attempt.state === "VERIFYING"
  )
    return (
      attempt.error ||
      "Your signed payment is saved on the server. Check payment to verify the same transaction; no new payment will be created."
    );
  let phase: string | undefined;
  try {
    phase = JSON.parse(read(`mercatum:payment:${attempt.id}`) || "null")?.phase;
  } catch {
    return "The saved payment record cannot be read. Use the original browser and wallet; this attempt cannot safely be reset.";
  }
  switch (phase) {
    case "proof_received":
      return "Your signed payment is saved in this browser. Check payment to resend that same proof for verification.";
    case "unsigned_aborted":
      return "An unsigned draft rejection is saved. Check payment to return to quote review.";
    case "draft":
      return "An unsigned draft is saved. Check payment to ask the original wallet to cancel it. Quote review resumes only when cancellation or rejection before signing is established.";
    case "sign_requested":
      return "The signing response was lost or interrupted. Check payment to look up the original transaction in your wallet. No new signature or payment will be requested.";
    case "prepared":
    case "wallet_requested":
      return "The wallet request was interrupted before a draft was saved. Check the original wallet for this attempt; without a draft or signed proof, automatic recovery is unavailable. Do not start a replacement payment.";
    default:
      return "This browser has no saved payment evidence. Open this task in the browser and profile used to pay, with the original wallet connected. The server cannot safely assume the payment was cancelled.";
  }
}
