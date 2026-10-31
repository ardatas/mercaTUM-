import { z } from "zod";
export const idSchema = z.string().min(1).max(100);
export const publicKeySchema = z.string().regex(/^(02|03)[a-fA-F0-9]{64}$/);
export const networkSchema = z.enum(["mainnet", "testnet"]);
export type Network = z.infer<typeof networkSchema>;
export const createTaskSchema = z
  .object({
    mode: z.enum(["chat", "code"]),
    prompt: z.string().trim().min(1).max(12000),
    providerId: z.literal("demo-provider"),
    snapshotId: idSchema.optional(),
    extensionOfTaskId: idSchema.optional(),
  })
  .strict()
  .superRefine((v, c) => {
    if ((v.mode === "code") !== !!v.snapshotId)
      c.addIssue({
        code: "custom",
        message:
          "Code tasks require a repository; chat tasks cannot attach one.",
      });
  });
export type CreateTask = z.infer<typeof createTaskSchema>;
export const toolCallSchema = z
  .object({
    taskId: idSchema,
    providerId: z.literal("demo-provider"),
    outputKind: z.enum(["answer", "changes"]),
  })
  .strict();
export const proofSchema = z
  .object({
    tx: z.array(z.number().int().min(0).max(255)).min(1).max(2_000_000),
    txid: z.string().regex(/^[a-f0-9]{64}$/),
    outputIndex: z.number().int().min(0).max(100000),
    satoshis: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    derivationPrefix: z.string().min(1).max(128),
    derivationSuffix: z.string().min(1).max(128),
    senderIdentityKey: publicKeySchema,
  })
  .strict();
export type PaymentProof = z.infer<typeof proofSchema>;
export const approveSchema = z
  .object({
    approved: z.literal(true),
    feePolicy: z.literal("review-before-sign"),
    maxAuthorizedDebitSats: z.number().int().positive().max(1000000),
  })
  .strict();
export type Approval = z.infer<typeof approveSchema>;
export interface Limits {
  maxInputChars: number;
  maxContextBytes: number;
  maxOutputTokens: number;
  maxModelCalls: number;
  maxRuntimeSeconds: number;
  maxRecoveryAttempts: number;
  maxTotalOutputTokens: number;
  continuationOutputTokens: number;
}
export const DEFAULT_LIMITS: Limits = {
  maxInputChars: 12000,
  maxContextBytes: 48000,
  maxOutputTokens: 4096,
  maxModelCalls: 4,
  maxRuntimeSeconds: 180,
  maxRecoveryAttempts: 1,
  maxTotalOutputTokens: 10240,
  continuationOutputTokens: 1024,
};
export interface ExecutionConfig {
  adapterId: "openai-responses" | "gemini-generate-content";
  modelId: string;
  version: "v1";
  limits: Limits;
}
export type TaskState =
  | "CREATED"
  | "PLANNING"
  | "SCOPE_REJECTED"
  | "AWAITING_APPROVAL"
  | "PAYMENT_PENDING"
  | "PAYMENT_UNKNOWN"
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "LIMIT_REACHED"
  | "FAILED_PAID"
  | "EXECUTION_UNKNOWN"
  | "CANCELLED"
  | "FAILED";
export interface PendingCall {
  callId: string;
  arguments: z.infer<typeof toolCallSchema>;
  checkpoint: unknown[];
  state: "pending" | "resolved";
}
export interface Artifact {
  id: string;
  name: string;
  content: string;
  mimeType: string;
}
export interface TaskResult {
  answer: string;
  completion: "complete" | "partial";
  limitReason?: string;
  modelId: string;
  usage?: { inputTokens: number; outputTokens: number };
  durationMs?: number;
  checks: "not_run";
  artifacts: Artifact[];
  coordinatorAnswer?: string;
}
export interface Task extends CreateTask {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  state: TaskState;
  config: ExecutionConfig;
  fingerprint: string;
  context: string;
  pendingCall?: PendingCall;
  scopeSummary?: string;
  intendedDeliverable?: string;
  quoteId?: string;
  attemptId?: string;
  receiptId?: string;
  result?: TaskResult;
  error?: { code: string; message: string };
  callsUsed: number;
  outputTokensUsed: number;
  recoveryAttempts: number;
  generation: number;
  leaseUntil?: number;
  upstreamStarted?: boolean;
  phase?: "execute" | "resume";
}
export interface Quote {
  id: string;
  ownerId: string;
  taskId: string;
  fingerprint: string;
  providerId: "demo-provider";
  network: Network;
  recipientIdentityKey: string;
  payerIdentityKey: string;
  pricingMode: "fixed";
  pricingPolicyVersion: "v1";
  scopeSummary: string;
  intendedDeliverable: string;
  priceSats: number;
  modelId: string;
  limits: Limits;
  configurationDigest: string;
  limitPolicy: string;
  expiresAt: string;
  derivationPrefix: string;
}
export type AttemptState =
  | "APPROVED"
  | "WALLET_REQUESTED"
  | "PROOF_RECEIVED"
  | "VERIFYING"
  | "VERIFIED"
  | "REJECTED"
  | "PAYMENT_UNKNOWN";
export interface PaymentAttempt {
  id: string;
  ownerId: string;
  taskId: string;
  quoteId: string;
  approval: Approval;
  state: AttemptState;
  createdAt: string;
  proof?: PaymentProof;
  proofDigest?: string;
  receiptId?: string;
  error?: string;
  arcade?: ArcadeObservation;
  internalized?: boolean;
}
export interface ArcadeObservation {
  submittedAt: string;
  postStatus: string;
  status: string;
  networkKnown: boolean;
}
export interface Receipt {
  id: string;
  ownerId: string;
  taskId: string;
  quoteId: string;
  attemptId: string;
  network: Network;
  txid: string;
  outputIndex: number;
  amountSats: number;
  recipient: string;
  verifiedAt: string;
  arcade: ArcadeObservation;
  internalized: true;
  explorerUrl: string;
}
export interface TaskEvent {
  id: number;
  taskId: string;
  timestamp: string;
  type: string;
  data: Record<string, unknown>;
}
export interface SnapshotFile {
  path: string;
  hash: string;
  bytes: number;
  content: string;
}
export interface RepositorySnapshot {
  id: string;
  ownerId: string;
  owner: string;
  repository: string;
  requestedRef: string;
  commitSha: string;
  files: SnapshotFile[];
  excluded: string[];
  selectedPaths: string[];
  consentedAt?: string;
}
export type PublicQuote = Omit<
  Quote,
  "ownerId" | "fingerprint" | "configurationDigest"
>;
export interface PublicTask {
  id: string;
  mode: "chat" | "code";
  prompt: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  modelId: string;
  snapshotId?: string;
  extensionOfTaskId?: string;
  quote?: PublicQuote;
  attempt?: Omit<PaymentAttempt, "proof" | "proofDigest" | "ownerId">;
  receipt?: Omit<Receipt, "ownerId">;
  result?: Omit<TaskResult, "artifacts"> & {
    artifacts: Omit<Artifact, "content">[];
  };
  error?: Task["error"];
  events: TaskEvent[];
}
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryable = false,
  ) {
    super(message);
  }
}
