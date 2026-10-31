import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { z, ZodError } from "zod";
import {
  AppError,
  approveSchema,
  unsignedAbortSchema,
  proofSchema,
  publicKeySchema,
} from "../shared/contracts.js";
import type { PaymentService } from "./payments/service.js";
import type { RepositoryService } from "./repos/service.js";
import type { PaymentAttempt, Quote } from "../shared/contracts.js";
import type { Config } from "./config.js";
import { Store } from "./tasks/store.js";
import type { TaskService } from "./tasks/service.js";
import { auth, rateLimit } from "./auth.js";
import { mcpHandler } from "./mcp/server.js";
export interface AppDependencies {
  store: Store;
  config: Config;
  tasks: TaskService;
  payments: PaymentService;
  repos: RepositoryService;
  readiness: () => {
    ready: boolean;
    model: boolean;
    wallet: boolean;
    paymentsEnabled: boolean;
    blockers: string[];
  };
}
export function createApp({
  store,
  config,
  tasks,
  payments,
  repos,
  readiness,
}: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use((_req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://localhost:3321 https://localhost:2121 http://127.0.0.1:3321 https://127.0.0.1:2121; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  });
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.get("/readyz", (_req, res) => {
    const r = readiness();
    res.status(r.ready ? 200 : 503).json(r);
  });
  app.use(express.json({ limit: "8mb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const planningIpLimit = rateLimit(30, 3_600_000);
  app.use(["/api/tasks", "/mcp"], (req, res, next) => {
    const plans =
      req.method === "POST" &&
      (req.originalUrl === "/api/tasks" ||
        (req.originalUrl === "/mcp" &&
          req.body?.method === "tools/call" &&
          req.body?.params?.name === "create_task"));
    if (plans) planningIpLimit(req, res, next);
    else next();
  });
  const access = auth(store, config);
  app.get("/api/session", rateLimit(30, 60000), (req, res) =>
    access.session(req, res),
  );
  app.use("/api", access.browser, rateLimit(300, 60000));
  const owner = (res: express.Response) => res.locals.ownerId as string;
  const key = (req: express.Request) =>
    z.string().min(8).max(100).parse(req.headers["idempotency-key"]);
  const id = (req: express.Request, name = "id") => String(req.params[name]);
  const safeQuote = ({
    ownerId,
    fingerprint,
    configurationDigest,
    ...q
  }: Quote) => q;
  const safeAttempt = ({ ownerId, proof, proofDigest, ...a }: PaymentAttempt) =>
    a;
  const providers = () => [
    {
      id: "demo-provider",
      name: "mercaTUM Studio",
      isDemo: true,
      capabilities: ["chat", "code"],
      modelId: config.MODEL_ID || null,
      priceSats: config.TASK_PRICE_SATS,
      availabilityLabel: "Simulated capacity",
      capacity: { fiveHour: 72, weekly: 86 },
      ready: readiness().ready,
    },
  ];
  app.get("/api/providers", (_req, res) =>
    res.json({ providers: providers(), readiness: readiness() }),
  );
  app.get("/api/wallet-config", (_req, res) =>
    res.json(payments.walletConfig()),
  );
  app.get("/api/tasks", (_req, res) => res.json(tasks.list(owner(res))));
  app.post("/api/tasks", rateLimit(10, 3600000), (req, res) =>
    res.status(201).json(tasks.create(owner(res), req.body, key(req))),
  );
  app.get("/api/tasks/:id", (req, res) =>
    res.json(tasks.get(owner(res), id(req))),
  );
  app.post("/api/tasks/:id/cancel", (req, res) => {
    z.object({}).strict().parse(req.body);
    res.json(tasks.cancel(owner(res), id(req)));
  });
  app.post("/api/tasks/:id/retry", (req, res) => {
    z.object({}).strict().parse(req.body);
    res.json(tasks.retry(owner(res), id(req), key(req)));
  });
  app.post("/api/tasks/:id/quote", async (req, res) => {
    const body = z
      .object({ payerIdentityKey: publicKeySchema })
      .strict()
      .parse(req.body);
    res.json(
      safeQuote(
        await payments.quote(
          owner(res),
          id(req),
          body.payerIdentityKey,
          key(req),
        ),
      ),
    );
  });
  app.post("/api/quotes/:id/approve", (req, res) =>
    res.json(
      safeAttempt(
        payments.approve(
          owner(res),
          id(req),
          approveSchema.parse(req.body),
          key(req),
        ),
      ),
    ),
  );
  app.post("/api/payments/:id/wallet-requested", (req, res) => {
    z.object({}).strict().parse(req.body);
    const claim = payments.claimWallet(owner(res), id(req));
    res.json({ ...claim, attempt: safeAttempt(claim.attempt) });
  });
  const paymentResult = (v: import("./payments/service.js").PaymentStatus) => ({
    attempt: {
      id: v.attempt.id,
      state: v.attempt.state,
      taskId: v.attempt.taskId,
      quoteId: v.attempt.quoteId,
      error: v.attempt.error,
    },
    receipt: v.receipt ? (({ ownerId, ...r }) => r)(v.receipt) : undefined,
  });
  app.post("/api/payments/:id/unsigned-abort", (req, res) => {
    const r = payments.rejectUnsigned(
      owner(res),
      id(req),
      unsignedAbortSchema.parse(req.body),
    );
    res.json(paymentResult(r));
  });
  app.post("/api/payments/:id/proof", async (req, res) => {
    const r = await payments.submitProof(
      owner(res),
      id(req),
      proofSchema.parse(req.body),
    );
    res.status(r.receipt ? 200 : 202).json(paymentResult(r));
  });
  app.post("/api/payments/:id/reconcile", async (req, res) => {
    z.object({}).strict().parse(req.body);
    const r = await payments.reconcile(owner(res), id(req));
    res.status(r.receipt ? 200 : 202).json(paymentResult(r));
  });
  app.get("/api/tasks/:id/events", (req, res) => {
    tasks.get(owner(res), id(req));
    let after = Number(req.headers["last-event-id"] ?? req.query.after ?? 0);
    if (!Number.isSafeInteger(after) || after < 0) after = 0;
    res.set({
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const send = () => {
      for (const e of store.events(id(req), after)) {
        res.write(`id: ${e.id}\ndata: ${JSON.stringify(e)}\n\n`);
        after = e.id;
      }
    };
    send();
    const timer = setInterval(send, 1000);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
    req.on("close", () => {
      clearInterval(timer);
      clearInterval(heartbeat);
    });
  });
  app.get("/api/tasks/:id/artifacts/:artifactId", (req, res) => {
    const a = tasks.artifact(owner(res), id(req), id(req, "artifactId"));
    res
      .set({
        "Content-Type": a.mimeType,
        "Content-Disposition": `attachment; filename="${a.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}"`,
      })
      .send(a.content);
  });
  app.post(
    "/api/repositories/import",
    rateLimit(10, 3600000),
    async (req, res) => {
      key(req);
      res.status(201).json(await repos.import(owner(res), req.body));
    },
  );
  app.get("/api/repositories/:id", (req, res) =>
    res.json(repos.publicSnapshot(owner(res), id(req))),
  );
  app.post("/api/repositories/:id/context", (req, res) => {
    const body = z
      .object({
        selectedPaths: z.array(z.string()).min(1).max(200),
        consent: z.literal(true),
      })
      .strict()
      .parse(req.body);
    res.json(repos.consent(owner(res), id(req), body.selectedPaths));
  });
  app.get("/api/mcp-tokens", (_req, res) => res.json(access.list(owner(res))));
  app.post("/api/mcp-tokens", (req, res) => {
    z.object({}).strict().parse(req.body);
    res.status(201).json(access.issue(owner(res)));
  });
  app.delete("/api/mcp-tokens/:id", (req, res) => {
    access.revoke(owner(res), id(req));
    res.json({ revoked: true });
  });
  app.post(
    "/mcp",
    access.mcp,
    rateLimit(60, 60000),
    mcpHandler(tasks, providers, config.PUBLIC_APP_URL),
  );
  app.all("/mcp", (_req, res) => res.sendStatus(405));
  app.use("/api", (_req, _res, next) =>
    next(new AppError("NOT_FOUND", "Route unavailable.", 404)),
  );
  const client = resolve("dist/client");
  if (existsSync(client)) {
    app.use(express.static(client, { index: false }));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(client, "index.html")),
    );
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      const safe =
        error instanceof AppError
          ? error
          : error instanceof ZodError
            ? new AppError("INVALID_INPUT", "Check the submitted fields.")
            : new AppError(
                "INTERNAL_ERROR",
                "The request could not be completed.",
                500,
                true,
              );
      res.status(safe.status).json({
        error: {
          code: safe.code,
          message: safe.message,
          retryable: safe.retryable,
        },
      });
    },
  );
  return app;
}
