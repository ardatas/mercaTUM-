import { afterEach, describe, it, expect, vi } from "vitest";
import request from "supertest";
import { Store } from "../src/server/tasks/store";
import { TaskService, type AiAdapter } from "../src/server/tasks/service";
import { PaymentService } from "../src/server/payments/service";
import { RepositoryService } from "../src/server/repos/service";
import { readConfig } from "../src/server/config";
import { createApp } from "../src/server/app";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const stores: Store[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup(ready = true) {
  const store = new Store(":memory:");
  stores.push(store);
  const config = readConfig({ MODEL_ID: "test-model" });
  const ai: AiAdapter = {
    plan: vi.fn<AiAdapter["plan"]>(async (t) => ({
      pendingCall: {
        callId: "actual-fixture-call",
        arguments: {
          taskId: t.id,
          providerId: "demo-provider",
          outputKind: "answer",
        },
        checkpoint: [{ private: "opaque" }],
        state: "pending",
      },
      scopeSummary: "Test",
      intendedDeliverable: "Answer",
    })),
    execute: vi.fn(),
    resume: vi.fn(),
  };
  const repos = new RepositoryService(store);
  const tasks = new TaskService(store, config, ai, repos, () => ready);
  const payments = new PaymentService(
    store,
    { network: "testnet", walletStorageDir: "/unused", priceSats: 100 },
    () => false,
  );
  const app = createApp({
    store,
    config,
    tasks,
    payments,
    repos,
    readiness: () => ({
      ready: false,
      model: ready,
      wallet: false,
      paymentsEnabled: false,
      blockers: ["No wallet"],
    }),
  });
  return { store, app, tasks, ai };
}
async function session(app: ReturnType<typeof setup>["app"]) {
  const agent = request.agent(app);
  const res = await agent.get("/api/session");
  return { agent, csrf: res.body.csrf };
}
const command = {
  mode: "chat",
  prompt: "Explain a tree",
  providerId: "demo-provider",
};
describe("HTTP ownership and trusted commands", () => {
  it("requires cookie ownership, same Origin and CSRF on mutations", async () => {
    const { app } = setup();
    await request(app).get("/api/tasks").expect(401);
    const a = await session(app);
    await a.agent.post("/api/tasks").send(command).expect(403);
    await a.agent
      .post("/api/tasks")
      .set("Origin", "https://evil.example")
      .set("X-CSRF-Token", a.csrf)
      .send(command)
      .expect(403);
    const created = await a.agent
      .post("/api/tasks")
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", a.csrf)
      .set("Idempotency-Key", "task-key-123")
      .send(command)
      .expect(201);
    const b = await session(app);
    await b.agent.get("/api/tasks/" + created.body.id).expect(404);
    await b.agent.get("/api/tasks/" + created.body.id + "/events").expect(404);
    await b.agent
      .get("/api/tasks/" + created.body.id + "/artifacts/any")
      .expect(404);
  });
  it("fails closed when model is unavailable and rejects forged paid inputs", async () => {
    const { app, store } = setup(false);
    const a = await session(app);
    await a.agent
      .post("/api/tasks")
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", a.csrf)
      .set("Idempotency-Key", "task-key-123")
      .send(command)
      .expect(503);
    await a.agent
      .post("/api/tasks")
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", a.csrf)
      .set("Idempotency-Key", "task-key-456")
      .send({ ...command, paid: true })
      .expect(400);
    expect(store.list("task")).toHaveLength(0);
    await request(app).get("/readyz").expect(503);
    await request(app).get("/healthz").expect(200);
  });
  it("sets hardened cookie and does not disclose error details or private continuation", async () => {
    const { app } = setup();
    const a = await session(app);
    const r = await a.agent
      .post("/api/tasks")
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", a.csrf)
      .set("Idempotency-Key", "task-key-123")
      .send(command);
    await new Promise((r) => setTimeout(r, 5));
    const t = await a.agent.get("/api/tasks/" + r.body.id);
    expect(JSON.stringify(t.body)).not.toContain("opaque");
    expect(JSON.stringify(t.body)).not.toContain("ownerId");
    expect(JSON.stringify(t.body)).not.toContain("fingerprint");
    expect(t.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    const fresh = await request(app).get("/api/session");
    expect(fresh.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(fresh.headers["set-cookie"][0]).toContain("SameSite=Strict");
  });
  it("official MCP client lists/calls four tools, shares ownership, cannot pay, and revocation works", async () => {
    const { app } = setup();
    const a = await session(app);
    const issued = await a.agent
      .post("/api/mcp-tokens")
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", a.csrf)
      .send({})
      .expect(201);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    const url = new URL(`http://127.0.0.1:${address.port}/mcp`);
    const client = new Client({ name: "acceptance-test", version: "1.0.0" });
    try {
      await client.connect(
        new StreamableHTTPClientTransport(url, {
          requestInit: {
            headers: { Authorization: `Bearer ${issued.body.token}` },
          },
        }),
      );
      const tools = await client.listTools();
      expect(tools.tools.map((t) => t.name).sort()).toEqual([
        "create_task",
        "get_result",
        "get_task",
        "list_providers",
      ]);
      const made = await client.callTool({
        name: "create_task",
        arguments: { ...command, requestId: "mcp-create-1" },
      });
      const id = JSON.parse((made.content as { text: string }[])[0].text).id;
      await new Promise((r) => setTimeout(r, 5));
      const status = await client.callTool({
        name: "get_task",
        arguments: { taskId: id },
      });
      const data = JSON.parse((status.content as { text: string }[])[0].text);
      expect(data.approvalUrl).toBe("http://localhost:3000/?task=" + id);
      expect(data.state).toBe("AWAITING_APPROVAL");
      await a.agent.get("/api/tasks/" + id).expect(200);
      await a.agent
        .delete("/api/mcp-tokens/" + issued.body.id)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", a.csrf)
        .expect(200);
      await expect(client.listTools()).rejects.toThrow();
    } finally {
      await client.close();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
