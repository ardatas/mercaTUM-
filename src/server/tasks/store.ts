import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import type { Task, TaskEvent, Receipt } from "../../shared/contracts.js";
import { AppError } from "../../shared/contracts.js";
export const newId = () => randomUUID();
export const now = () => new Date().toISOString();
export const digest = (data: unknown) =>
  createHash("sha256")
    .update(typeof data === "string" ? data : JSON.stringify(data))
    .digest("hex");
export class Store {
  readonly db: Database.Database;
  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(`
 CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,owner TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(kind,id));
 CREATE INDEX IF NOT EXISTS owner_records ON records(kind,owner);
 CREATE TABLE IF NOT EXISTS idempotency(owner TEXT NOT NULL,route TEXT NOT NULL,key TEXT NOT NULL,hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(owner,route,key));
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,task TEXT NOT NULL,type TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS task_events ON events(task,id);
 CREATE TABLE IF NOT EXISTS receipts(task TEXT PRIMARY KEY,network TEXT NOT NULL,txid TEXT NOT NULL,vout INTEGER NOT NULL,json TEXT NOT NULL,UNIQUE(network,txid,vout));
 CREATE TABLE IF NOT EXISTS prefixes(prefix TEXT PRIMARY KEY,quote TEXT NOT NULL);
 `);
  }
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn).immediate();
  }
  put<T extends { id: string; ownerId: string }>(kind: string, value: T) {
    this.db
      .prepare(
        "INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json",
      )
      .run(kind, value.id, value.ownerId, JSON.stringify(value));
    return value;
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db
      .prepare("SELECT json FROM records WHERE kind=? AND id=?")
      .get(kind, id) as { json: string } | undefined;
    return row ? JSON.parse(row.json) : undefined;
  }
  owned<T extends { ownerId: string }>(
    kind: string,
    id: string,
    owner: string,
  ): T {
    const v = this.get<T>(kind, id);
    if (!v || v.ownerId !== owner)
      throw new AppError("NOT_FOUND", "This item is unavailable.", 404);
    return v;
  }
  list<T>(kind: string, owner?: string): T[] {
    const rows = (
      owner
        ? this.db
            .prepare("SELECT json FROM records WHERE kind=? AND owner=?")
            .all(kind, owner)
        : this.db.prepare("SELECT json FROM records WHERE kind=?").all(kind)
    ) as { json: string }[];
    return rows.map((r) => JSON.parse(r.json));
  }
  remove(kind: string, id: string) {
    this.db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id);
  }
  idempotent<T>(
    owner: string,
    route: string,
    key: string,
    body: unknown,
    fn: () => T,
  ): T {
    return this.transaction(() => {
      if (!/^[\w-]{8,100}$/.test(key))
        throw new AppError("INVALID_INPUT", "Provide a valid Idempotency-Key.");
      const hash = digest(body);
      const row = this.db
        .prepare(
          "SELECT hash,result FROM idempotency WHERE owner=? AND route=? AND key=?",
        )
        .get(owner, route, key) as { hash: string; result: string } | undefined;
      if (row) {
        if (row.hash !== hash)
          throw new AppError(
            "IDEMPOTENCY_CONFLICT",
            "This key was used with different input.",
            409,
          );
        return JSON.parse(row.result);
      }
      const result = fn();
      this.db
        .prepare("INSERT INTO idempotency VALUES (?,?,?,?,?)")
        .run(owner, route, key, hash, JSON.stringify(result));
      return result;
    });
  }
  event(taskId: string, type: string, data: Record<string, unknown> = {}) {
    const time = now();
    const r = this.db
      .prepare("INSERT INTO events(task,type,data,created) VALUES (?,?,?,?)")
      .run(taskId, type, JSON.stringify(data), time);
    return Number(r.lastInsertRowid);
  }
  events(task: string, after = 0): TaskEvent[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM events WHERE task=? AND id>? ORDER BY id LIMIT 1000",
        )
        .all(task, after) as {
        id: number;
        task: string;
        type: string;
        data: string;
        created: string;
      }[]
    ).map((r) => ({
      id: r.id,
      taskId: r.task,
      type: r.type,
      data: JSON.parse(r.data),
      timestamp: r.created,
    }));
  }
  receipt(taskId: string): Receipt | undefined {
    const r = this.db
      .prepare("SELECT json FROM receipts WHERE task=?")
      .get(taskId) as { json: string } | undefined;
    return r ? JSON.parse(r.json) : undefined;
  }
  saveReceipt(receipt: Receipt) {
    this.db
      .prepare("INSERT INTO receipts VALUES (?,?,?,?,?)")
      .run(
        receipt.taskId,
        receipt.network,
        receipt.txid,
        receipt.outputIndex,
        JSON.stringify(receipt),
      );
  }
  updateTask(id: string, fn: (t: Task) => void): Task {
    return this.transaction(() => {
      const t = this.get<Task>("task", id);
      if (!t) throw new AppError("NOT_FOUND", "Task unavailable.", 404);
      fn(t);
      t.updatedAt = now();
      this.put("task", t);
      return t;
    });
  }
  claim(id: string): Task | undefined {
    return this.transaction(() => {
      const t = this.get<Task>("task", id);
      if (!t || t.state !== "READY" || !this.receipt(id) || !t.pendingCall)
        return;
      t.generation++;
      t.state = "RUNNING";
      t.leaseUntil = Date.now() + t.config.limits.maxRuntimeSeconds * 1000;
      t.upstreamStarted = false;
      t.phase = t.result ? "resume" : "execute";
      this.put("task", t);
      this.event(id, "execution.started");
      return t;
    });
  }
  fenced(id: string, generation: number, fn: (t: Task) => void): Task {
    return this.updateTask(id, (t) => {
      if (
        t.state !== "RUNNING" ||
        t.generation !== generation ||
        !t.leaseUntil ||
        t.leaseUntil < Date.now()
      )
        throw new AppError("STALE_WORKER", "Execution claim expired.", 409);
      fn(t);
    });
  }
  recover() {
    for (const t of this.list<Task>("task")) {
      if (t.state === "RUNNING") {
        t.state =
          t.result?.completion === "partial"
            ? "LIMIT_REACHED"
            : t.result
              ? "FAILED_PAID"
              : t.upstreamStarted
                ? "EXECUTION_UNKNOWN"
                : "READY";
        t.generation++;
        t.leaseUntil = undefined;
        this.put("task", t);
      } else if (t.state === "PLANNING") {
        t.state = "FAILED";
        t.error = {
          code: "PLANNING_INTERRUPTED",
          message:
            "Planning was interrupted. Start a new task; no payment was made.",
        };
        this.put("task", t);
      }
    }
  }
  close() {
    this.db.close();
  }
}
