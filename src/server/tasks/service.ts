import { executionThinking } from "../../shared/marketplace.js";
import {
  AppError,
  createTaskSchema,
  type CreateTask,
  type Task,
  type PublicTask,
  type TaskResult,
  type Receipt,
  type PendingCall,
  type Quote,
} from "../../shared/contracts.js";
import { Store, digest, newId, now } from "./store.js";
import type { Config } from "../config.js";
export interface AiAdapter {
  plan(task: Task): Promise<{
    pendingCall: PendingCall;
    scopeSummary: string;
    intendedDeliverable: string;
    usage?: { inputTokens: number; outputTokens: number };
  }>;
  execute(
    task: Task,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<TaskResult & { changeSet?: unknown }>;
  resume(
    task: Task,
    receiptId: string,
    result: TaskResult,
  ): Promise<{
    answer: string;
    usage?: { inputTokens: number; outputTokens: number };
  }>;
}
export interface RepoAdapter {
  context(owner: string, id: string): string;
  changes(owner: string, id: string, raw: unknown): TaskResult["artifacts"];
}
export class TaskService {
  private active = new Set<string>();
  constructor(
    readonly store: Store,
    readonly config: Config,
    readonly ai: AiAdapter,
    readonly repos: RepoAdapter,
    readonly modelReady: () => boolean,
  ) {}
  create(owner: string, input: unknown, key: string): PublicTask {
    const command = createTaskSchema.parse(input);
    const taskId = this.store.idempotent(
      owner,
      "create-task",
      key,
      command,
      () => {
        if (!this.modelReady())
          throw new AppError(
            "PROVIDER_UNAVAILABLE",
            "The model is not ready. No payment can be requested.",
            503,
            true,
          );
        // Admission is shared by browser and MCP and survives process restarts.
        const since = new Date(Date.now() - 3_600_000).toISOString();
        const recent = this.store
          .list<Task>("task")
          .filter((t) => t.createdAt >= since);
        if (
          recent.filter((t) => t.ownerId === owner).length >= 10 ||
          recent.length >= 60
        )
          throw new AppError(
            "PLANNING_QUOTA",
            "The free planning allowance is exhausted. Try again after an hour.",
            429,
            true,
          );
        if (command.extensionOfTaskId) {
          const parent = this.store.owned<Task>(
            "task",
            command.extensionOfTaskId,
            owner,
          );
          if (!["SUCCEEDED", "LIMIT_REACHED"].includes(parent.state))
            throw new AppError(
              "INVALID_INPUT",
              "Extensions require a completed or limit-reached task. Technical failures use recovery.",
            );
        }
        const context = command.snapshotId
          ? this.repos.context(owner, command.snapshotId)
          : "";
        if (Buffer.byteLength(context) > this.config.limits.maxContextBytes)
          throw new AppError("SCOPE_REJECTED", "Select a smaller context.");
        const id = newId();
        const config = {
          adapterId:
            this.config.MODEL_PROVIDER === "gemini"
              ? ("gemini-generate-content" as const)
              : ("openai-responses" as const),
          modelId: this.config.MODEL_ID,
          version: "v1" as const,
          limits: { ...this.config.limits },
          ...(command.selection && this.config.MODEL_PROVIDER === "gemini"
            ? { thinkingLevel: executionThinking(command.selection.effort) }
            : {}),
        };
        const task: Task = {
          ...command,
          id,
          ownerId: owner,
          createdAt: now(),
          updatedAt: now(),
          state: "CREATED",
          config,
          context,
          fingerprint: digest({ command, config, context }),
          callsUsed: 0,
          outputTokensUsed: 0,
          recoveryAttempts: 0,
          generation: 0,
        };
        this.store.put("task", task);
        this.store.event(id, "task.created");
        return id;
      },
    );
    void this.plan(taskId);
    return this.get(owner, taskId);
  }
  async plan(id: string) {
    if (this.active.has(id) || this.active.size >= 2) return;
    const task = this.store.get<Task>("task", id);
    if (!task || task.state !== "CREATED") return;
    this.active.add(id);
    this.store.updateTask(id, (t) => {
      t.state = "PLANNING";
    });
    try {
      const planned = await this.ai.plan(task);
      this.store.updateTask(id, (t) => {
        if (t.state !== "PLANNING") return;
        t.pendingCall = planned.pendingCall;
        t.scopeSummary = planned.scopeSummary;
        t.intendedDeliverable = planned.intendedDeliverable;
        t.state = "AWAITING_APPROVAL";
      });
      this.store.event(id, "agent.tool_requested", {
        tool: "request_paid_execution",
        outputKind: task.mode === "code" ? "changes" : "answer",
      });
      this.store.event(id, "payment.approval_required");
    } catch (error) {
      const scope =
        error instanceof AppError && error.code === "SCOPE_REJECTED";
      this.store.updateTask(id, (t) => {
        t.state = scope ? "SCOPE_REJECTED" : "FAILED";
        t.error = {
          code: scope ? "SCOPE_REJECTED" : "PLANNING_FAILED",
          message: scope
            ? "This task does not fit the offered budget. Narrow the request or context."
            : "Planning could not finish. No payment was made.",
        };
      });
      this.store.event(id, "task.failed", {
        code: scope ? "SCOPE_REJECTED" : "PLANNING_FAILED",
      });
    } finally {
      this.active.delete(id);
    }
  }
  get(owner: string, id: string): PublicTask {
    const t = this.store.owned<Task>("task", id, owner);
    const rawQuote = t.quoteId
      ? this.store.get<Quote>("quote", t.quoteId)
      : undefined;
    const quote = rawQuote
      ? (({ ownerId, fingerprint, configurationDigest, ...safe }) => safe)(
          rawQuote,
        )
      : undefined;
    const rawAttempt = t.attemptId
      ? this.store.get<import("../../shared/contracts.js").PaymentAttempt>(
          "attempt",
          t.attemptId,
        )
      : undefined;
    const receipt = this.store.receipt(id);
    const attempt = rawAttempt
      ? (({ proof, proofDigest, ownerId, ...safe }) => safe)(rawAttempt)
      : undefined;
    const result = t.result
      ? {
          ...t.result,
          artifacts: t.result.artifacts.map(({ content, ...a }) => a),
        }
      : undefined;
    return {
      id: t.id,
      mode: t.mode,
      prompt: t.prompt,
      state: t.state,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      modelId: t.config.modelId,
      selection: t.selection,
      snapshotId: t.snapshotId,
      extensionOfTaskId: t.extensionOfTaskId,
      quote,
      attempt,
      receipt: receipt ? (({ ownerId, ...safe }) => safe)(receipt) : undefined,
      result,
      error: t.error,
      events: this.store.events(id),
    };
  }
  list(owner: string) {
    const removed = new Set(
      this.store
        .list<{ id: string }>("history-removal", owner)
        .map((r) => r.id),
    );
    return this.store
      .list<Task>("task", owner)
      .filter((t) => !removed.has(t.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100)
      .map((t) => ({
        id: t.id,
        mode: t.mode,
        prompt: t.prompt,
        state: t.state,
        createdAt: t.createdAt,
      }));
  }
  artifact(owner: string, id: string, artifactId: string) {
    const t = this.store.owned<Task>("task", id, owner);
    const a = t.result?.artifacts.find((a) => a.id === artifactId);
    if (!a) throw new AppError("NOT_FOUND", "Artifact unavailable.", 404);
    return a;
  }
  removeFromHistory(owner: string, id: string) {
    this.store.owned<Task>("task", id, owner);
    // Keep the ledger and task intact for reconciliation and active workers.
    // Separate records cannot be overwritten by an in-flight task update.
    this.store.put("history-removal", { id, ownerId: owner });
    return { removed: true };
  }
  retry(owner: string, id: string, key: string) {
    this.store.idempotent(owner, `retry:${id}`, key, {}, () => {
      const task = this.store.owned<Task>("task", id, owner);
      if (
        task.error?.code === "PAYMENT_REVOKED" ||
        !this.store.receipt(id) ||
        !["FAILED_PAID", "EXECUTION_UNKNOWN"].includes(task.state)
      )
        throw new AppError(
          "INVALID_STATE",
          "This task cannot be retried.",
          409,
        );
      if (
        task.recoveryAttempts >= task.config.limits.maxRecoveryAttempts ||
        task.callsUsed >= task.config.limits.maxModelCalls ||
        task.outputTokensUsed >= task.config.limits.maxTotalOutputTokens
      )
        throw new AppError(
          "RECOVERY_EXHAUSTED",
          "The paid recovery allowance is exhausted. Manual recovery is required.",
          409,
        );
      task.recoveryAttempts++;
      task.state = "READY";
      task.error = undefined;
      this.store.put("task", task);
      return { id };
    });
    return this.get(owner, id);
  }
  cancel(owner: string, id: string) {
    this.store.updateTask(id, (t) => {
      if (t.ownerId !== owner)
        throw new AppError("NOT_FOUND", "Task unavailable.", 404);
      if (
        !["CREATED", "PLANNING", "AWAITING_APPROVAL"].includes(t.state) ||
        t.attemptId
      )
        throw new AppError(
          "INVALID_STATE",
          "A possible payment must be reconciled before cancellation.",
          409,
        );
      t.state = "CANCELLED";
    });
    return this.get(owner, id);
  }
  async tick() {
    for (const t of this.store.list<Task>("task")) {
      if (t.state === "RUNNING" && t.leaseUntil && t.leaseUntil < Date.now()) {
        this.store.updateTask(t.id, (current) => {
          if (
            current.generation === t.generation &&
            current.state === "RUNNING"
          ) {
            current.state =
              current.result?.completion === "partial"
                ? "LIMIT_REACHED"
                : current.result
                  ? "FAILED_PAID"
                  : current.upstreamStarted
                    ? "EXECUTION_UNKNOWN"
                    : "READY";
            current.generation++;
            current.leaseUntil = undefined;
          }
        });
        continue;
      }
      if (t.state === "CREATED") void this.plan(t.id);
      if (t.state === "READY") void this.run(t.id);
    }
  }
  private reserve(id: string, generation: number, phase: "execute" | "resume") {
    return this.store.fenced(id, generation, (t) => {
      const tokens =
        phase === "resume"
          ? t.config.limits.continuationOutputTokens
          : t.config.limits.maxOutputTokens;
      if (
        t.callsUsed >= t.config.limits.maxModelCalls ||
        t.outputTokensUsed + tokens > t.config.limits.maxTotalOutputTokens
      )
        throw new AppError("LIMIT_REACHED", "Model budget exhausted.");
      t.callsUsed++;
      t.outputTokensUsed += tokens; // reserve pessimistically: unknown calls cannot erase consumed budget
      t.upstreamStarted = true;
      t.phase = phase;
    });
  }
  async run(id: string) {
    if (this.active.has(id) || this.active.size >= 2) return;
    const task = this.store.claim(id);
    if (!task) return;
    this.active.add(id);
    const gen = task.generation;
    let started = false;
    let published = false;
    try {
      const receipt = this.store.receipt(id);
      if (
        !receipt ||
        receipt.taskId !== id ||
        !receipt.internalized ||
        !receipt.arcade.networkKnown ||
        !task.pendingCall
      )
        throw new AppError(
          "APPROVAL_REQUIRED",
          "A verified receipt is required.",
        );
      let result = task.result;
      if (!result) {
        const reserved = this.reserve(id, gen, "execute");
        started = true;
        let deltaBuffer = "";
        const flush = () => {
          if (deltaBuffer) {
            this.store.fenced(id, gen, () => {});
            this.store.event(id, "execution.text_delta", { text: deltaBuffer });
            deltaBuffer = "";
          }
        };
        const response = await this.ai.execute(
          reserved,
          (text) => {
            if (task.mode === "chat") {
              deltaBuffer += text;
              if (deltaBuffer.length > 256) flush();
            }
          },
          AbortSignal.timeout(
            Math.max(1, (task.leaseUntil ?? Date.now()) - Date.now()),
          ),
        );
        flush();
        const { changeSet, ...publicResult } = response;
        result = publicResult;
        if (task.mode === "code" && result.completion === "complete") {
          if (!changeSet)
            throw new AppError(
              "INVALID_CHANGESET",
              "The model returned no valid changes.",
            );
          result.artifacts = this.repos.changes(
            task.ownerId,
            task.snapshotId!,
            changeSet,
          );
        }
        this.store.fenced(id, gen, (t) => {
          t.result = result;
          t.upstreamStarted = false;
        });
        published = true;
        for (const a of result.artifacts)
          this.store.event(id, "artifact.created", {
            artifactId: a.id,
            name: a.name,
          });
      }
      const reserved = this.reserve(id, gen, "resume");
      started = true;
      const final = await this.ai.resume(reserved, receipt.id, result);
      this.store.fenced(id, gen, (t) => {
        t.result = { ...result!, coordinatorAnswer: final.answer };
        t.pendingCall!.state = "resolved";
        t.upstreamStarted = false;
        t.state =
          result!.completion === "partial" ? "LIMIT_REACHED" : "SUCCEEDED";
        t.leaseUntil = undefined;
      });
      this.store.event(
        id,
        result.completion === "partial"
          ? "task.limit_reached"
          : "task.completed",
        result.limitReason ? { reason: result.limitReason } : {},
      );
    } catch (error) {
      try {
        this.store.fenced(id, gen, (t) => {
          const knownLimit =
            (error instanceof AppError && error.code === "LIMIT_REACHED") ||
            t.result?.completion === "partial";
          const invalid =
            error instanceof AppError &&
            ["INVALID_CHANGESET", "EXECUTION_FAILED"].includes(error.code);
          t.state = knownLimit
            ? "LIMIT_REACHED"
            : t.result || published || invalid
              ? "FAILED_PAID"
              : started
                ? "EXECUTION_UNKNOWN"
                : "FAILED_PAID";
          t.error = {
            code: t.state,
            message: knownLimit
              ? "The fixed execution limit was reached. Valid progress is preserved."
              : t.state === "EXECUTION_UNKNOWN"
                ? "The model request outcome is unknown. Recovery uses the existing payment."
                : "Execution did not complete. The payment is retained; recovery does not charge again.",
          };
          t.leaseUntil = undefined;
        });
        this.store.event(
          id,
          this.store.get<Task>("task", id)?.state === "LIMIT_REACHED"
            ? "task.limit_reached"
            : "task.failed",
          {
            code: this.store.get<Task>("task", id)?.state,
          },
        );
      } catch {
        /* A newer generation owns publication. */
      }
    } finally {
      this.active.delete(id);
    }
  }
}
