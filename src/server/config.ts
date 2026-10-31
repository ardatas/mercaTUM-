import { z } from "zod";
import { DEFAULT_LIMITS, networkSchema } from "../shared/contracts.js";
const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATA_DIR: z.string().default("./data"),
  APP_NETWORK: networkSchema.default("testnet"),
  TASK_PRICE_SATS: z.coerce.number().int().min(1).max(100000).default(100),
  MODEL_ID: z.string().default(""),
  MODEL_API_KEY: z.string().default(""),
  PROVIDER_WALLET_ROOT_KEY: z.string().default(""),
  SESSION_SECRET: z.string().default(""),
  PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
});
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const c = schema.parse(env);
  if (
    c.NODE_ENV === "production" &&
    (!c.PUBLIC_APP_URL.startsWith("https://") || c.SESSION_SECRET.length < 32)
  )
    throw new Error(
      "Production requires HTTPS PUBLIC_APP_URL and SESSION_SECRET of at least 32 characters.",
    );
  return { ...c, limits: { ...DEFAULT_LIMITS } };
}
export type Config = ReturnType<typeof readConfig>;
