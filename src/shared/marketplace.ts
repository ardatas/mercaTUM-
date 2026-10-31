// Demo capacity fixtures, not measured quota or purchased entitlement.
// Benchmark snapshots are independently measured; see sources below.
export type Brand =
  "chatgpt" | "claude" | "gemini" | "mistral" | "kimi" | "deepseek";
export interface CatalogModel {
  id: string;
  label: string;
  efforts: readonly string[];
}
export interface Offer {
  id: string;
  brand: Brand;
  tier: string;
  seller: string;
  initials: string;
  color: string;
  remainingTokens: number;
  totalTokens: number;
  models: CatalogModel[];
  tag: string;
}
export const brandNames: Record<Brand, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  mistral: "Mistral",
  kimi: "Kimi",
  deepseek: "DeepSeek",
};
const gpt: CatalogModel[] = [
  {
    id: "gpt-6.1-sol",
    label: "GPT-6.1 Sol",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
  {
    id: "gpt-6-astra",
    label: "GPT-6 Astra",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
  {
    id: "gpt-6-luna",
    label: "GPT-6 Luna",
    efforts: ["none", "low", "medium", "high", "xhigh", "max"],
  },
];
const claude: CatalogModel[] = [
  {
    id: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    efforts: ["low", "medium", "high", "xhigh", "max"],
  },
];
const gemini: CatalogModel[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    efforts: ["low", "medium", "high"],
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon",
    efforts: ["low", "medium", "high"],
  },
];
export const offers: Offer[] = [
  {
    id: "chatgpt-pro",
    brand: "chatgpt",
    tier: "Pro",
    seller: "Alex M.",
    initials: "AM",
    color: "#b0f763",
    remainingTokens: 420000,
    totalTokens: 500000,
    models: gpt,
    tag: "All-rounder",
  },
  {
    id: "claude-max",
    brand: "claude",
    tier: "Max",
    seller: "Sophie K.",
    initials: "SK",
    color: "#ff8d66",
    remainingTokens: 186000,
    totalTokens: 250000,
    models: claude,
    tag: "Built for code",
  },
  {
    id: "gemini-ultra",
    brand: "gemini",
    tier: "AI Ultra",
    seller: "Leo W.",
    initials: "LW",
    color: "#aa8aff",
    remainingTokens: 850000,
    totalTokens: 1000000,
    models: gemini,
    tag: "Long context",
  },
  {
    id: "mistral-pro",
    brand: "mistral",
    tier: "Le Chat Pro",
    seller: "Emma R.",
    initials: "ER",
    color: "#ffc64d",
    remainingTokens: 264000,
    totalTokens: 400000,
    models: [
      {
        id: "mistral-large-4-0",
        label: "Mistral Large 4",
        efforts: ["low", "medium", "high"],
      },
      {
        id: "mistral-small-2603",
        label: "Mistral Small 4",
        efforts: ["none", "high"],
      },
    ],
    tag: "Fast & focused",
  },
  {
    id: "kimi-plus",
    brand: "kimi",
    tier: "Plus",
    seller: "Noah T.",
    initials: "NT",
    color: "#7ab4ff",
    remainingTokens: 310000,
    totalTokens: 500000,
    models: [
      {
        id: "kimi-k3.1-pro",
        label: "Kimi K3.1 Pro",
        efforts: ["low", "high", "max"],
      },
      { id: "kimi-k3", label: "Kimi K3", efforts: ["low", "high", "max"] },
    ],
    tag: "Deep research",
  },
  {
    id: "deepseek-pro",
    brand: "deepseek",
    tier: "Pro",
    seller: "Mia S.",
    initials: "MS",
    color: "#66dccc",
    remainingTokens: 740000,
    totalTokens: 1000000,
    models: [
      {
        id: "deepseek-v4-pro",
        label: "DeepSeek V4 Pro",
        efforts: ["off", "low", "high", "max"],
      },
      {
        id: "deepseek-flash",
        label: "DeepSeek V4.1 Flash",
        efforts: ["off", "low", "high", "max"],
      },
    ],
    tag: "Reasoning",
  },
  {
    id: "chatgpt-plus",
    brand: "chatgpt",
    tier: "Plus",
    seller: "Felix B.",
    initials: "FB",
    color: "#b0f763",
    remainingTokens: 92000,
    totalTokens: 160000,
    models: [gpt[0], gpt[2]],
    tag: "Everyday work",
  },
  {
    id: "claude-pro",
    brand: "claude",
    tier: "Pro",
    seller: "Lina H.",
    initials: "LH",
    color: "#ff8d66",
    remainingTokens: 68000,
    totalTokens: 100000,
    models: [claude[1]],
    tag: "Writing & code",
  },
];
export interface MarketplaceSelection {
  offerId: string;
  modelId: string;
  effort: string;
}
export function findSelection(selection: MarketplaceSelection) {
  const offer = offers.find((o) => o.id === selection.offerId);
  const model = offer?.models.find((m) => m.id === selection.modelId);
  return offer && model?.efforts.includes(selection.effort)
    ? { offer, model }
    : undefined;
}
export function defaultSelection(offerId = offers[0].id): MarketplaceSelection {
  const offer = offers.find((o) => o.id === offerId) ?? offers[0];
  const model = offer.models[0];
  return {
    offerId: offer.id,
    modelId: model.id,
    effort: model.efforts.includes("medium") ? "medium" : model.efforts[0],
  };
}
// Native generation setting, frozen with the task's existing execution limits.
export function executionThinking(effort: string): "LOW" | "MEDIUM" | "HIGH" {
  if (["high", "xhigh", "max", "thinking"].includes(effort)) return "HIGH";
  return effort === "medium" ? "MEDIUM" : "LOW";
}

export interface ModelBenchmark {
  score: number;
  variant: string;
  source: string;
}
export const benchmarkSnapshot = {
  name: "Artificial Analysis Intelligence Index",
  version: "5.0",
  checkedAt: "2026-10-31",
} as const;
// Scores describe the first named model on each offer, at the published variant.
// Reusing a model across subscription tiers must not change its benchmark score.
export const benchmarks: Partial<Record<string, ModelBenchmark>> = {
  "gpt-6.1-sol": {
    score: 55,
    variant: "Max",
    source: "https://artificialanalysis.ai/models/releases/gpt-6-1-sol",
  },
  "claude-opus-5-5": {
    score: 58,
    variant: "Max, default fallback",
    source: "https://artificialanalysis.ai/models/releases/claude-opus-5-5",
  },
  "claude-sonnet-5-5": {
    score: 54,
    variant: "Max, default fallback",
    source: "https://artificialanalysis.ai/models/releases/claude-sonnet-5-5",
  },
  "gemini-3.8-flash": {
    score: 31,
    variant: "High",
    source: "https://artificialanalysis.ai/models/releases/gemini-3-8-flash",
  },
  "mistral-large-4-0": {
    score: 26,
    variant: "High",
    source: "https://artificialanalysis.ai/models/releases/mistral-large-4",
  },
  "kimi-k3.1-pro": {
    score: 46,
    variant: "Reasoning",
    source: "https://artificialanalysis.ai/models/kimi-k3-1-pro",
  },
  "deepseek-v4-pro": {
    score: 23,
    variant: "0813, Max",
    source: "https://artificialanalysis.ai/models/releases/deepseek-v4-pro",
  },
};
export function offerBenchmark(offer: Offer) {
  return benchmarks[offer.models[0].id];
}
export function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}
