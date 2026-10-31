import { DEFAULT_LIMITS, type PublicQuote } from "../../src/shared/contracts";

export function previewQuote(): PublicQuote {
  return {
    id: "offline-quote",
    taskId: "fixture",
    providerId: "demo-provider",
    network: "mainnet",
    recipientIdentityKey: "02" + "11".repeat(32),
    payerIdentityKey: "03" + "22".repeat(32),
    pricingMode: "fixed",
    pricingPolicyVersion: "v1",
    scopeSummary: "Explain binary search in two short sentences.",
    intendedDeliverable: "A concise explanation of binary search.",
    priceSats: 100,
    modelId: "gemini-3.8-flash",
    limits: { ...DEFAULT_LIMITS },
    limitPolicy:
      "Stop at the quoted limit and preserve valid progress. Additional scope requires a separate purchase. Technical recovery uses this payment; no automatic refunds.",
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    derivationPrefix: "offline-fixture",
  };
}
