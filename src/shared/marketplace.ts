// Marketplace fixtures. Scores and capacity are presentation data, not measured execution telemetry.
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
  remaining: number;
  total: number;
  score: number;
  strengths: number[];
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
    remaining: 420,
    total: 500,
    score: 94,
    strengths: [96, 94, 91, 92, 88, 95],
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
    remaining: 186,
    total: 250,
    score: 96,
    strengths: [98, 96, 97, 88, 89, 95],
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
    remaining: 850,
    total: 1000,
    score: 93,
    strengths: [91, 94, 88, 97, 96, 92],
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
    remaining: 264,
    total: 400,
    score: 89,
    strengths: [86, 90, 91, 89, 95, 88],
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
    remaining: 310,
    total: 500,
    score: 91,
    strengths: [94, 91, 87, 95, 86, 90],
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
    remaining: 740,
    total: 1000,
    score: 92,
    strengths: [95, 97, 88, 89, 90, 93],
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
    remaining: 92,
    total: 160,
    score: 90,
    strengths: [91, 89, 93, 87, 94, 90],
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
    remaining: 68,
    total: 100,
    score: 92,
    strengths: [94, 90, 96, 86, 91, 92],
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
