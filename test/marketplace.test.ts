import { describe, it, expect } from "vitest";
import { createTaskSchema } from "../src/shared/contracts";
import {
  offers,
  defaultSelection,
  executionThinking,
} from "../src/shared/marketplace";
const base = {
  mode: "chat",
  prompt: "Explain trees",
  providerId: "demo-provider",
};
describe("marketplace task selection", () => {
  it("accepts supported offer/model/effort combinations and legacy tasks", () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
    for (const offer of offers)
      for (const model of offer.models)
        for (const effort of model.efforts) {
          const selection = { offerId: offer.id, modelId: model.id, effort };
          expect(
            createTaskSchema.parse({ ...base, selection }).selection,
          ).toEqual(selection);
        }
  });
  it("rejects cross-offer models, arbitrary models, unsupported effort and extra fields", () => {
    for (const selection of [
      { ...defaultSelection("claude-max"), modelId: "gpt-6-astra" },
      { ...defaultSelection(), modelId: "https://untrusted.example" },
      { ...defaultSelection("gemini-ultra"), effort: "minimal" },
      { ...defaultSelection(), priceSats: 1 },
    ])
      expect(createTaskSchema.safeParse({ ...base, selection }).success).toBe(
        false,
      );
  });
  it("maps supported display effort into bounded native thinking", () => {
    expect(executionThinking("none")).toBe("LOW");
    expect(executionThinking("medium")).toBe("MEDIUM");
    for (const effort of ["high", "xhigh", "max"])
      expect(executionThinking(effort)).toBe("HIGH");
  });
});
