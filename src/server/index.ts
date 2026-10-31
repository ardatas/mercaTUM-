import { mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { readConfig } from "./config.js";
import { Store } from "./tasks/store.js";
import { TaskService } from "./tasks/service.js";
import { ResponsesAdapter } from "./ai/adapter.js";
import { RepositoryService } from "./repos/service.js";
import { PaymentService } from "./payments/service.js";
import { createApp } from "./app.js";
process.umask(0o077);
const config = readConfig();
mkdirSync(config.DATA_DIR, { recursive: true, mode: 0o700 });
chmodSync(config.DATA_DIR, 0o700);
const store = new Store(join(config.DATA_DIR, "app.sqlite"));
store.recover();
const ai = new ResponsesAdapter({ apiKey: config.MODEL_API_KEY });
let modelReady = false;
const payments = new PaymentService(
  store,
  {
    network: config.APP_NETWORK,
    walletRootKeyHex: config.PROVIDER_WALLET_ROOT_KEY,
    walletStorageDir: config.DATA_DIR,
    priceSats: config.TASK_PRICE_SATS,
  },
  () => modelReady && config.PAYMENTS_ENABLED === "true",
);
await payments.initialize();
const repos = new RepositoryService(store);
const tasks = new TaskService(store, config, ai, repos, () => modelReady);
const readiness = () => {
  const wallet = payments.walletConfig().initialized;
  const enabled = config.PAYMENTS_ENABLED === "true";
  const blockers = [
    ...(!modelReady ? ["Model access is not verified."] : []),
    ...(!wallet ? ["Provider wallet setup is pending."] : []),
    ...(!enabled
      ? ["Live payments are disabled pending wallet validation."]
      : []),
  ];
  return {
    ready: modelReady && wallet && enabled,
    model: modelReady,
    wallet,
    paymentsEnabled: enabled,
    blockers,
  };
};
const app = createApp({ store, config, tasks, payments, repos, readiness });
const server = app.listen(
  config.PORT,
  config.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log(`mercaTUM listening on port ${config.PORT}`),
);
void ai
  .probe(config.MODEL_ID)
  .then((ok) => {
    modelReady = ok;
    console.log(`Model readiness: ${ok ? "verified" : "unavailable"}`);
  })
  .catch(() => {
    modelReady = false;
  });
const worker = setInterval(() => void tasks.tick(), 1000);
let reconciling = false;
const reconciliation = setInterval(() => {
  if (reconciling) return;
  reconciling = true;
  void payments
    .reconcileAll()
    .catch(() => console.warn("Payment reconciliation pending."))
    .finally(() => {
      reconciling = false;
    });
}, 30000);
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  clearInterval(worker);
  clearInterval(reconciliation);
  server.close();
  await payments.close();
  store.close();
  process.exit(0);
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
