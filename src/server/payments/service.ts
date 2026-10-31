import { randomBytes } from "node:crypto";
import {
  AppError,
  approveSchema,
  unsignedAbortSchema,
  type UnsignedAbort,
  proofSchema,
  publicKeySchema,
  type Approval,
  type Network,
  type PaymentAttempt,
  type PaymentProof,
  type Quote,
  type Task,
  type Receipt,
} from "../../shared/contracts.js";
import { Store, digest, newId, now } from "../tasks/store.js";
import {
  NETWORKS,
  ToolboxMerchant,
  rejectedStatus,
  type Merchant,
} from "./merchant.js";
export interface PaymentConfig {
  network: Network;
  walletRootKeyHex?: string;
  walletStorageDir: string;
  priceSats: number;
}
export interface PaymentStatus {
  attempt: PaymentAttempt;
  receipt?: Receipt;
}
export class PaymentService {
  private merchant?: Merchant;
  private initializationError = false;
  constructor(
    private store: Store,
    private config: PaymentConfig,
    private readiness: () => boolean,
    merchant?: Merchant,
  ) {
    if (
      !Number.isSafeInteger(config.priceSats) ||
      config.priceSats <= 0 ||
      config.priceSats > 1_000_000
    )
      throw new Error("Invalid fixed service price.");
    this.merchant = merchant;
    this.store.db.exec(
      "CREATE TABLE IF NOT EXISTS payment_locks (attempt TEXT PRIMARY KEY, token TEXT NOT NULL, expires INTEGER NOT NULL)",
    );
  }
  async initialize() {
    if (this.merchant || !this.config.walletRootKeyHex) return;
    try {
      this.merchant = await ToolboxMerchant.create(
        this.config.network,
        this.config.walletRootKeyHex,
        this.config.walletStorageDir,
      );
    } catch {
      this.initializationError = true;
    }
  }
  walletConfig() {
    return {
      initialized: !!this.merchant,
      network: this.config.network,
      recipientIdentityKey: this.merchant?.identityKey,
      paymentsEnabled: !!this.merchant && this.readiness(),
      blockers: [
        ...(!this.merchant
          ? [
              this.initializationError
                ? "Provider wallet initialization failed."
                : "Provider wallet is not configured.",
            ]
          : []),
        ...(!this.readiness()
          ? [
              "Payments require configured model access and operator-enabled wallet validation.",
            ]
          : []),
      ],
      guidance:
        "Use BSV Desktop or BSV Browser. Inspect the origin and spending grants; approve each quote and native wallet request yourself.",
    };
  }
  private ready() {
    if (!this.merchant || !this.readiness())
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Payments are not enabled for this provider.",
        503,
      );
    return this.merchant;
  }
  async quote(
    ownerId: string,
    taskId: string,
    payerIdentityKey: string,
    key: string,
  ): Promise<Quote> {
    payerIdentityKey = publicKeySchema.parse(payerIdentityKey).toLowerCase();
    const merchant = this.ready();
    if (merchant.identityKey === payerIdentityKey)
      throw new AppError(
        "PAYMENT_MISMATCH",
        "Choose a buyer wallet distinct from the provider wallet.",
      );
    return this.store.idempotent(
      ownerId,
      `quote:${taskId}`,
      key,
      { payerIdentityKey },
      () => {
        const task = this.store.owned<Task>("task", taskId, ownerId);
        if (
          task.state !== "AWAITING_APPROVAL" ||
          !task.pendingCall ||
          task.pendingCall.state !== "pending" ||
          this.store.receipt(taskId)
        )
          throw new AppError(
            "APPROVAL_REQUIRED",
            "This task is not awaiting a purchase quote.",
            409,
          );
        if (task.attemptId)
          throw new AppError(
            "PAYMENT_UNKNOWN",
            "Reconcile the existing payment attempt before another debit.",
            409,
          );
        const active = task.quoteId
          ? this.store.get<Quote>("quote", task.quoteId)
          : undefined;
        if (
          active &&
          active.payerIdentityKey === payerIdentityKey &&
          Date.parse(active.expiresAt) > Date.now()
        )
          return active;
        const quote: Quote = {
          id: newId(),
          ownerId,
          taskId,
          fingerprint: task.fingerprint,
          providerId: task.providerId,
          network: this.config.network,
          recipientIdentityKey: merchant.identityKey,
          payerIdentityKey,
          pricingMode: "fixed",
          pricingPolicyVersion: "v1",
          scopeSummary: task.scopeSummary || task.prompt.slice(0, 300),
          intendedDeliverable:
            task.intendedDeliverable ||
            (task.mode === "code"
              ? "Validated changes and a downloadable diff"
              : "An answer within the quoted limits"),
          priceSats: this.config.priceSats,
          modelId: task.config.modelId,
          limits: task.config.limits,
          configurationDigest: digest(task.config),
          limitPolicy:
            "Stop at the quoted limit and preserve valid progress. Additional scope requires a separate purchase. Technical recovery uses this payment; no automatic refunds.",
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          derivationPrefix: randomBytes(16).toString("base64"),
        };
        this.store.db
          .prepare("INSERT INTO prefixes VALUES (?,?)")
          .run(quote.derivationPrefix, quote.id);
        this.store.put("quote", quote);
        task.quoteId = quote.id;
        this.store.put("task", task);
        this.store.event(taskId, "quote.created", { quoteId: quote.id });
        return quote;
      },
    );
  }
  approve(
    ownerId: string,
    quoteId: string,
    approval: Approval,
    key: string,
  ): PaymentAttempt {
    approval = approveSchema.parse(approval);
    this.ready();
    const id = this.store.idempotent(
      ownerId,
      `approve:${quoteId}`,
      key,
      approval,
      () => {
        const quote = this.store.owned<Quote>("quote", quoteId, ownerId);
        const task = this.store.owned<Task>("task", quote.taskId, ownerId);
        if (task.attemptId || this.store.receipt(task.id))
          throw new AppError(
            "PAYMENT_UNKNOWN",
            "This task already has a payment attempt. Reconcile it without another debit.",
            409,
          );
        if (
          task.state !== "AWAITING_APPROVAL" ||
          task.quoteId !== quote.id ||
          !task.pendingCall ||
          quote.fingerprint !== task.fingerprint ||
          digest(task.config) !== quote.configurationDigest
        )
          throw new AppError(
            "APPROVAL_REQUIRED",
            "This quote is no longer current.",
            409,
          );
        if (Date.parse(quote.expiresAt) <= Date.now())
          throw new AppError(
            "QUOTE_EXPIRED",
            "Request and approve a fresh quote.",
            409,
          );
        if (approval.maxAuthorizedDebitSats < quote.priceSats)
          throw new AppError(
            "INVALID_INPUT",
            "Maximum debit must cover the service price.",
          );
        const attempt: PaymentAttempt = {
          id: newId(),
          ownerId,
          taskId: task.id,
          quoteId,
          approval,
          state: "APPROVED",
          createdAt: now(),
        };
        this.store.put("attempt", attempt);
        task.attemptId = attempt.id;
        task.state = "PAYMENT_PENDING";
        delete task.error;
        this.store.put("task", task);
        return attempt.id;
      },
    );
    return this.store.owned<PaymentAttempt>("attempt", id, ownerId);
  }
  claimWallet(ownerId: string, attemptId: string) {
    this.ready();
    return this.store.transaction(() => {
      const attempt = this.store.owned<PaymentAttempt>(
        "attempt",
        attemptId,
        ownerId,
      );
      if (attempt.state !== "APPROVED") return { attempt, invokeWallet: false };
      attempt.state = "WALLET_REQUESTED";
      this.store.put("attempt", attempt);
      this.store.event(attempt.taskId, "payment.submitted", {
        attemptId,
        phase: "wallet_requested",
      });
      return { attempt, invokeWallet: true };
    });
  }
  rejectUnsigned(
    ownerId: string,
    attemptId: string,
    input: UnsignedAbort,
  ): PaymentStatus {
    const rejection = unsignedAbortSchema.parse(input);
    return this.store.transaction(() => {
      const attempt = this.store.owned<PaymentAttempt>(
        "attempt",
        attemptId,
        ownerId,
      );
      const task = this.store.owned<Task>("task", attempt.taskId, ownerId);
      if (
        attempt.state === "REJECTED" &&
        digest(attempt.unsignedAbort) === digest(rejection)
      )
        return this.status(ownerId, attemptId);
      if (
        attempt.quoteId !== rejection.quoteId ||
        task.attemptId !== attemptId ||
        !["WALLET_REQUESTED", "PAYMENT_UNKNOWN"].includes(attempt.state) ||
        !["PAYMENT_PENDING", "PAYMENT_UNKNOWN"].includes(task.state) ||
        attempt.proof ||
        attempt.proofDigest ||
        attempt.receiptId ||
        attempt.arcade ||
        attempt.internalized ||
        this.store.receipt(task.id)
      )
        throw new AppError(
          "PAYMENT_UNKNOWN",
          "This payment requires reconciliation; it cannot be released as an unsigned draft.",
          409,
        );
      const quote = this.store.owned<Quote>("quote", attempt.quoteId, ownerId);
      if (
        !rejection.aborted &&
        (rejection.code !== "DEBIT_LIMIT_EXCEEDED" ||
          rejection.feeSats === undefined ||
          !Number.isSafeInteger(quote.priceSats + rejection.feeSats) ||
          quote.priceSats + rejection.feeSats <=
            attempt.approval.maxAuthorizedDebitSats)
      )
        throw new AppError(
          "PAYMENT_UNKNOWN",
          "Only an unsigned draft proven to exceed the original approval can be released without an abort acknowledgement.",
          409,
        );
      const detail =
        rejection.feeSats === undefined
          ? ""
          : ` Service price: ${quote.priceSats} sats. Draft network fee: ${rejection.feeSats} sats. Total: ${quote.priceSats + rejection.feeSats} sats. Approved maximum: ${attempt.approval.maxAuthorizedDebitSats} sats.`;
      attempt.state = "REJECTED";
      attempt.unsignedAbort = rejection;
      attempt.error =
        (rejection.aborted
          ? "The unsigned payment draft was cancelled before signing."
          : "The saved unsigned draft exceeded your approved limit and was rejected before signing. The wallet did not return a fresh cancellation acknowledgement.") +
        detail;
      this.store.put("attempt", attempt);
      task.state = "AWAITING_APPROVAL";
      task.error = {
        code: rejection.code,
        message:
          attempt.error +
          " Review a fresh quote and explicitly approve any new spending limit. Fees can change.",
      };
      delete task.attemptId;
      delete task.quoteId;
      task.updatedAt = now();
      this.store.put("task", task);
      this.store.event(task.id, "payment.rejected", {
        attemptId,
        code: rejection.code,
        ...(rejection.feeSats === undefined
          ? {}
          : { feeSats: rejection.feeSats }),
      });
      return this.status(ownerId, attemptId);
    });
  }
  async submitProof(
    ownerId: string,
    attemptId: string,
    input: PaymentProof,
  ): Promise<PaymentStatus> {
    const proof = proofSchema.parse(input);
    this.store.transaction(() => {
      const attempt = this.store.owned<PaymentAttempt>(
        "attempt",
        attemptId,
        ownerId,
      );
      if (attempt.state === "APPROVED" || attempt.state === "REJECTED")
        throw new AppError(
          "APPROVAL_REQUIRED",
          "Claim the wallet action before submitting proof.",
          409,
        );
      if (attempt.proofDigest && attempt.proofDigest !== digest(proof))
        throw new AppError(
          "PAYMENT_REPLAY",
          "A different proof is already recorded for this attempt.",
          409,
        );
      if (!attempt.proof) {
        attempt.proof = proof;
        attempt.proofDigest = digest(proof);
        attempt.state = "PROOF_RECEIVED";
        this.store.put("attempt", attempt);
      }
    });
    return this.reconcile(ownerId, attemptId);
  }
  private status(ownerId: string, attemptId: string): PaymentStatus {
    const attempt = this.store.owned<PaymentAttempt>(
      "attempt",
      attemptId,
      ownerId,
    );
    return { attempt, receipt: this.store.receipt(attempt.taskId) };
  }
  async reconcile(ownerId: string, attemptId: string): Promise<PaymentStatus> {
    // APPROVED means no client has acquired permission to call createAction.
    // Serialize release with claimWallet so a late browser cannot spend a released quote.
    this.store.transaction(() => {
      const a = this.store.owned<PaymentAttempt>("attempt", attemptId, ownerId);
      if (a.state !== "APPROVED") return;
      const t = this.store.owned<Task>("task", a.taskId, ownerId);
      if (
        t.attemptId !== a.id ||
        a.proof ||
        a.proofDigest ||
        a.receiptId ||
        a.arcade ||
        a.internalized ||
        this.store.receipt(t.id)
      )
        return;
      a.state = "REJECTED";
      a.error =
        "The wallet transaction was never started. Review a fresh quote to try again.";
      this.store.put("attempt", a);
      t.state = "AWAITING_APPROVAL";
      t.error = { code: "PAYMENT_NOT_STARTED", message: a.error };
      delete t.attemptId;
      delete t.quoteId;
      t.updatedAt = now();
      this.store.put("task", t);
      this.store.event(t.id, "payment.rejected", {
        attemptId,
        code: "PAYMENT_NOT_STARTED",
      });
    });
    const initial = this.status(ownerId, attemptId);
    if (!initial.attempt.proof || !this.merchant) {
      if (initial.attempt.state === "WALLET_REQUESTED")
        this.store.transaction(() => {
          const a = this.store.owned<PaymentAttempt>(
            "attempt",
            attemptId,
            ownerId,
          );
          if (a.state === "WALLET_REQUESTED") {
            a.state = "PAYMENT_UNKNOWN";
            a.error =
              "Recover the existing transaction from wallet history or saved browser proof. Another debit is not authorized.";
            this.store.put("attempt", a);
            this.store.updateTask(a.taskId, (t) => {
              t.state = "PAYMENT_UNKNOWN";
            });
          }
        });
      return this.status(ownerId, attemptId);
    }
    const token = newId();
    const locked = this.store.transaction(() => {
      const old = this.store.db
        .prepare("SELECT expires FROM payment_locks WHERE attempt=?")
        .get(attemptId) as { expires: number } | undefined;
      if (old && old.expires > Date.now()) return false;
      this.store.db
        .prepare(
          "INSERT INTO payment_locks VALUES (?,?,?) ON CONFLICT(attempt) DO UPDATE SET token=excluded.token,expires=excluded.expires",
        )
        .run(attemptId, token, Date.now() + 120_000);
      return true;
    });
    if (!locked) return this.status(ownerId, attemptId);
    const persist = (fn: (attempt: PaymentAttempt, task: Task) => void) =>
      this.store.transaction(() => {
        const lock = this.store.db
          .prepare("SELECT token,expires FROM payment_locks WHERE attempt=?")
          .get(attemptId) as { token: string; expires: number } | undefined;
        if (!lock || lock.token !== token || lock.expires <= Date.now())
          throw new AppError(
            "PAYMENT_UNKNOWN",
            "Payment reconciliation lease expired.",
            202,
            true,
          );
        const attempt = this.store.owned<PaymentAttempt>(
          "attempt",
          attemptId,
          ownerId,
        );
        const task = this.store.owned<Task>("task", attempt.taskId, ownerId);
        fn(attempt, task);
        this.store.put("attempt", attempt);
        task.updatedAt = now();
        this.store.put("task", task);
      });
    try {
      const quote = this.store.owned<Quote>(
        "quote",
        initial.attempt.quoteId,
        ownerId,
      );
      if (
        quote.network !== this.config.network ||
        quote.recipientIdentityKey !== this.merchant.identityKey
      )
        throw new AppError(
          "PAYMENT_UNKNOWN",
          "Restore the original provider wallet and network to reconcile.",
          202,
          true,
        );
      const proof = initial.attempt.proof;
      const verified = await this.merchant.verify(proof, quote);
      if (
        verified.feeSats + quote.priceSats >
        initial.attempt.approval.maxAuthorizedDebitSats
      )
        throw new AppError(
          "PAYMENT_MISMATCH",
          "Transaction fee exceeds the approved total debit; manual payment recovery is required.",
        );
      persist((a) => {
        if (!a.receiptId) a.state = "VERIFYING";
      });
      let observation = initial.attempt.arcade;
      if (!observation) {
        observation = await this.merchant.submit(verified.txid, verified.ef);
        persist((a) => {
          a.arcade = observation;
        });
      }
      observation = await this.merchant.observe(verified.txid, observation);
      persist((a, t) => {
        a.arcade = observation;
        if (rejectedStatus(observation!.status)) {
          a.error =
            "Network rejected this transaction; manual payment recovery is required.";
          if (a.receiptId) {
            t.generation++;
            t.state = "FAILED_PAID";
            t.error = { code: "PAYMENT_REVOKED", message: a.error };
          }
        }
      });
      if (!observation.networkKnown)
        throw new AppError(
          "PAYMENT_UNKNOWN",
          "Waiting for an acceptable Arcade network observation.",
          202,
          true,
        );
      if (initial.receipt) return this.status(ownerId, attemptId);
      // Repeat on crash recovery only; same managed outpoint is idempotent in the pinned Toolbox.
      if (!initial.attempt.internalized) {
        await this.merchant.internalize(proof);
        persist((a) => {
          a.internalized = true;
        });
      }
      persist((attempt, task) => {
        const current = this.store.receipt(task.id);
        if (current && current.attemptId !== attempt.id)
          throw new AppError(
            "PAYMENT_REPLAY",
            "This task has another accepted payment.",
            409,
          );
        if (!current) {
          const receipt: Receipt = {
            id: newId(),
            ownerId,
            taskId: task.id,
            quoteId: quote.id,
            attemptId,
            network: quote.network,
            txid: verified.txid,
            outputIndex: proof.outputIndex,
            amountSats: quote.priceSats,
            recipient: quote.recipientIdentityKey,
            verifiedAt: now(),
            arcade: observation!,
            internalized: true,
            explorerUrl: NETWORKS[quote.network].explorer + verified.txid,
          };
          this.store.saveReceipt(receipt);
          attempt.receiptId = receipt.id;
          task.receiptId = receipt.id;
        }
        attempt.state = "VERIFIED";
        delete attempt.error;
        if (!task.pendingCall || task.pendingCall.state !== "pending")
          throw new AppError(
            "PAYMENT_UNKNOWN",
            "Saved agent continuation requires recovery.",
            202,
            true,
          );
        task.state = "READY";
        delete task.error;
        this.store.event(task.id, "payment.verified", {
          attemptId,
          txid: verified.txid,
        });
      });
    } catch (error) {
      try {
        persist((a, t) => {
          if (!a.receiptId) {
            a.state = "PAYMENT_UNKNOWN";
            a.error =
              error instanceof AppError
                ? error.message
                : "Payment verification requires reconciliation. No replacement debit is authorized.";
            t.state = "PAYMENT_UNKNOWN";
          } else if (
            error instanceof AppError &&
            error.code === "PAYMENT_MISMATCH"
          ) {
            t.generation++;
            t.state = "FAILED_PAID";
            t.error = {
              code: "PAYMENT_REVOKED",
              message:
                "The previously accepted payment no longer verifies. Manual recovery is required.",
            };
          }
        });
      } catch {
        /* another reconciler owns the lease */
      }
    } finally {
      this.store.db
        .prepare("DELETE FROM payment_locks WHERE attempt=? AND token=?")
        .run(attemptId, token);
    }
    return this.status(ownerId, attemptId);
  }
  async reconcileAll() {
    for (const attempt of this.store.list<PaymentAttempt>("attempt")) {
      if (attempt.proof) await this.reconcile(attempt.ownerId, attempt.id);
    }
  }
  async close() {
    await this.merchant?.close();
  }
}
