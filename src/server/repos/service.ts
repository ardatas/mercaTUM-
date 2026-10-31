import { z } from "zod";
import { createTwoFilesPatch } from "diff";
import {
  AppError,
  type Artifact,
  type RepositorySnapshot,
  type SnapshotFile,
} from "../../shared/contracts.js";
import { Store, digest, newId, now } from "../tasks/store.js";

export const REPOSITORY_LIMITS = {
  files: 200,
  fileBytes: 128 * 1024,
  snapshotBytes: 4 * 1024 * 1024,
  contextBytes: 48_000,
  changes: 50,
};
const importSchema = z
  .object({
    owner: z.string().regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/),
    repository: z
      .string()
      .regex(/^[a-zA-Z0-9_.-]{1,100}$/)
      .refine((v) => v !== "." && v !== ".."),
    ref: z
      .string()
      .min(1)
      .max(200)
      .refine((v) => !/[\x00-\x20\x7f]/.test(v)),
  })
  .strict();
const forbiddenSegments =
  /^(?:\.git|\.svn|node_modules|vendor|dist|build|\.next|coverage|\.ssh|\.aws|\.azure|\.gcloud)$/i;
const forbiddenNames =
  /^(?:\.env.*|\.npmrc|\.netrc|\.pypirc|credentials(?:\..*)?|secrets?(?:\..*)?|id_rsa.*|id_ed25519.*)$/i;
const binaryExtension =
  /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|woff2?|ttf|mp[34]|mov|exe|dll|so|dylib|sqlite3?|db|lockb|pem|key|p12|pfx|der|keystore)$/i;
export function safePath(path: string): boolean {
  if (
    !path ||
    path.length > 500 ||
    path.startsWith("/") ||
    /[\\:\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(path)
  )
    return false;
  const segments = path.split("/");
  return (
    segments.every(
      (p) =>
        p &&
        p !== "." &&
        p !== ".." &&
        !forbiddenSegments.test(p) &&
        !forbiddenNames.test(p),
    ) &&
    !/^\.github\/workflows(?:\/|$)/i.test(path) &&
    !binaryExtension.test(path)
  );
}
export function containsSecret(content: string): boolean {
  return /-----BEGIN (?:[A-Z ]*PRIVATE KEY|OPENSSH PRIVATE KEY)-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b|(?:api[_-]?key|secret|password|access[_-]?token|private[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9/+_-]{16,}/i.test(
    content,
  );
}
function textFile(buffer: Buffer): string | undefined {
  if (buffer.includes(0)) return undefined;
  // Preserve a UTF-8 BOM: hashes and generated patches must refer to the exact imported bytes.
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      buffer,
    );
  } catch {
    return undefined;
  }
}
function limit(message: string): never {
  throw new AppError("REPO_LIMIT_EXCEEDED", message, 413);
}
const changeSchema = z
  .object({
    path: z.string(),
    operation: z.enum(["create", "replace", "delete"]),
    expectedBaseHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    newContent: z.string().optional(),
  })
  .strict();
export const changeSetSchema = z
  .object({
    summary: z.string().min(1).max(4000),
    changes: z.array(changeSchema).min(1).max(REPOSITORY_LIMITS.changes),
  })
  .strict();
export type ChangeSet = z.infer<typeof changeSetSchema>;

/** Produces artifacts in memory. Never applies model output to the local filesystem. */
export function validateChanges(
  snapshot: RepositorySnapshot,
  raw: unknown,
): { changeSet: ChangeSet; artifacts: Artifact[]; files: SnapshotFile[] } {
  const parsed = changeSetSchema.safeParse(raw);
  if (!parsed.success)
    throw new AppError(
      "INVALID_CHANGESET",
      "The model returned an invalid change set.",
    );
  const changeSet = parsed.data;
  const files = new Map(snapshot.files.map((f) => [f.path, { ...f }]));
  const seen = new Set<string>();
  const artifacts: Artifact[] = [];
  let patch = "",
    outputBytes = 0;
  for (const c of changeSet.changes) {
    const base = files.get(c.path);
    const excluded = snapshot.excluded.some(
      (p) => c.path === p || c.path.startsWith(`${p}/`),
    );
    const collision = [...files.keys()].some(
      (p) =>
        p !== c.path &&
        (p.startsWith(`${c.path}/`) || c.path.startsWith(`${p}/`)),
    );
    if (!safePath(c.path) || excluded || collision || seen.has(c.path))
      throw new AppError(
        "INVALID_CHANGESET",
        "A change targets a protected, conflicting or duplicate path.",
      );
    seen.add(c.path);
    if (c.operation === "create") {
      if (
        base ||
        c.expectedBaseHash !== undefined ||
        c.newContent === undefined
      )
        throw new AppError(
          "INVALID_CHANGESET",
          "Created files require new content and a new path.",
        );
    } else if (
      !base ||
      !snapshot.selectedPaths.includes(c.path) ||
      c.expectedBaseHash !== base.hash
    ) {
      throw new AppError(
        "INVALID_CHANGESET",
        "Changed files must match the approved snapshot hashes.",
      );
    }
    if (
      c.operation === "delete"
        ? c.newContent !== undefined
        : c.newContent === undefined
    )
      throw new AppError(
        "INVALID_CHANGESET",
        "The change content does not match its operation.",
      );
    const content = c.newContent ?? "";
    const bytes = Buffer.byteLength(content);
    outputBytes += bytes;
    if (
      bytes > REPOSITORY_LIMITS.fileBytes ||
      outputBytes > REPOSITORY_LIMITS.snapshotBytes ||
      containsSecret(content) ||
      content.includes("\0")
    )
      throw new AppError(
        "INVALID_CHANGESET",
        "Generated content exceeds limits or contains sensitive material.",
      );
    patch += createTwoFilesPatch(
      c.operation === "create" ? "/dev/null" : `a/${c.path}`,
      c.operation === "delete" ? "/dev/null" : `b/${c.path}`,
      base?.content ?? "",
      content,
      "",
      "",
      { context: 3 },
    );
    if (c.operation === "delete") files.delete(c.path);
    else {
      files.set(c.path, {
        path: c.path,
        hash: digest(content),
        bytes,
        content,
      });
      artifacts.push({
        id: newId(),
        name: c.path,
        content,
        mimeType: "text/plain; charset=utf-8",
      });
    }
  }
  if (
    files.size > REPOSITORY_LIMITS.files ||
    [...files.values()].reduce((n, f) => n + f.bytes, 0) >
      REPOSITORY_LIMITS.snapshotBytes
  )
    throw new AppError(
      "INVALID_CHANGESET",
      "The resulting snapshot exceeds repository limits.",
    );
  artifacts.unshift({
    id: newId(),
    name: "changes.patch",
    content: patch,
    mimeType: "text/x-diff; charset=utf-8",
  });
  return { changeSet, artifacts, files: [...files.values()] };
}

export class RepositoryService {
  private fetcher: typeof fetch;
  constructor(
    private store: Store,
    options: { fetch?: typeof fetch } = {},
  ) {
    this.fetcher = options.fetch ?? fetch;
  }
  private async github(
    path: string,
    maxBytes = 2 * 1024 * 1024,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`https://api.github.com${path}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Mercatum-public-snapshot",
        },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AppError(
        "REPO_UNAVAILABLE",
        "GitHub could not be reached. Try again later.",
        502,
        true,
      );
    }
    if (!response.ok)
      throw new AppError(
        "REPO_UNAVAILABLE",
        "This public repository or revision is unavailable, or GitHub rate limits were reached.",
        400,
        true,
      );
    if (Number(response.headers.get("content-length") ?? 0) > maxBytes)
      limit("GitHub response exceeds the import limit.");
    if (!response.body)
      throw new AppError(
        "REPO_UNAVAILABLE",
        "GitHub returned no repository data.",
        502,
      );
    const reader = response.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) limit("GitHub response exceeds the import limit.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AppError(
        "REPO_UNAVAILABLE",
        "GitHub returned invalid repository data.",
        502,
      );
    }
  }
  async import(ownerId: string, input: unknown) {
    const data = importSchema.parse(input);
    const base = `/repos/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.repository)}`;
    const metadata = z
      .object({ private: z.literal(false) })
      .safeParse(await this.github(base));
    if (!metadata.success)
      throw new AppError(
        "INVALID_INPUT",
        "Only public repositories are supported.",
      );
    const commit = z
      .object({
        sha: z.string().regex(/^[a-f0-9]{40}$/),
        commit: z.object({
          tree: z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/) }),
        }),
      })
      .parse(
        await this.github(`${base}/commits/${encodeURIComponent(data.ref)}`),
      );
    const tree = z
      .object({
        truncated: z.boolean(),
        tree: z.array(
          z.object({
            path: z.string(),
            type: z.string(),
            mode: z.string(),
            sha: z.string().regex(/^[a-f0-9]{40}$/),
            size: z.number().int().nonnegative().optional(),
          }),
        ),
      })
      .parse(
        await this.github(
          `${base}/git/trees/${commit.commit.tree.sha}?recursive=1`,
        ),
      );
    if (tree.truncated)
      limit(
        "This repository is too large to import. Choose a smaller repository.",
      );
    const files: SnapshotFile[] = [],
      excluded: string[] = [];
    let totalBytes = 0;
    const candidates = tree.tree.filter((f) => {
      if (f.type === "tree") return false;
      if (
        f.type !== "blob" ||
        !["100644", "100755"].includes(f.mode) ||
        !safePath(f.path)
      ) {
        excluded.push(f.path);
        return false;
      }
      return true;
    });
    if (candidates.length > REPOSITORY_LIMITS.files)
      limit(
        "The repository exceeds 200 eligible files. Choose a smaller repository.",
      );
    for (const f of candidates) {
      if ((f.size ?? Infinity) > REPOSITORY_LIMITS.fileBytes)
        limit(
          "A repository file exceeds 128 KiB. Choose a smaller repository.",
        );
      const blob = z
        .object({
          encoding: z.literal("base64"),
          content: z.string(),
          size: z.number().int().nonnegative(),
        })
        .parse(await this.github(`${base}/git/blobs/${f.sha}`, 200_000));
      if (blob.size > REPOSITORY_LIMITS.fileBytes)
        limit("A repository file exceeds 128 KiB.");
      const buffer = Buffer.from(blob.content.replace(/\s/g, ""), "base64");
      if (
        buffer.length !== blob.size ||
        buffer.length > REPOSITORY_LIMITS.fileBytes
      )
        throw new AppError(
          "REPO_UNAVAILABLE",
          "GitHub returned inconsistent file contents.",
          502,
        );
      const content = textFile(buffer);
      if (content === undefined || containsSecret(content)) {
        excluded.push(f.path);
        continue;
      }
      totalBytes += buffer.length;
      if (totalBytes > REPOSITORY_LIMITS.snapshotBytes)
        limit("The repository exceeds 4 MiB of text.");
      files.push({
        path: f.path,
        hash: digest(content),
        bytes: buffer.length,
        content,
      });
    }
    if (!files.length)
      throw new AppError(
        "INVALID_INPUT",
        "This repository has no eligible text files.",
      );
    const snapshot: RepositorySnapshot = {
      id: newId(),
      ownerId,
      owner: data.owner,
      repository: data.repository,
      requestedRef: data.ref,
      commitSha: commit.sha,
      files,
      excluded,
      selectedPaths: [],
    };
    this.store.put("snapshot", snapshot);
    return this.publicSnapshot(ownerId, snapshot.id);
  }
  publicSnapshot(ownerId: string, id: string) {
    const { ownerId: _, ...snapshot } = this.store.owned<RepositorySnapshot>(
      "snapshot",
      id,
      ownerId,
    );
    return snapshot;
  }
  consent(ownerId: string, id: string, selectedPaths: string[]) {
    const paths = z
      .array(z.string())
      .min(1)
      .max(REPOSITORY_LIMITS.files)
      .parse(selectedPaths);
    return this.store.transaction(() => {
      const snapshot = this.store.owned<RepositorySnapshot>(
        "snapshot",
        id,
        ownerId,
      );
      if (
        new Set(paths).size !== paths.length ||
        paths.some((p) => !snapshot.files.some((f) => f.path === p))
      )
        throw new AppError(
          "INVALID_INPUT",
          "Select eligible files from the imported manifest.",
        );
      const selected = [...paths].sort();
      if (
        snapshot.consentedAt &&
        JSON.stringify([...snapshot.selectedPaths].sort()) !==
          JSON.stringify(selected)
      )
        throw new AppError(
          "CONTEXT_IMMUTABLE",
          "Import a new snapshot to change approved context.",
          409,
        );
      snapshot.selectedPaths = selected;
      if (
        Buffer.byteLength(this.renderContext(snapshot)) >
        REPOSITORY_LIMITS.contextBytes
      )
        limit("Selected context exceeds 48,000 bytes. Select fewer files.");
      snapshot.consentedAt ??= now();
      this.store.put("snapshot", snapshot);
      return this.publicSnapshot(ownerId, id);
    });
  }
  private renderContext(snapshot: RepositorySnapshot) {
    return JSON.stringify({
      repository: `${snapshot.owner}/${snapshot.repository}`,
      commitSha: snapshot.commitSha,
      files: snapshot.files
        .filter((f) => snapshot.selectedPaths.includes(f.path))
        .map(({ path, hash, content }) => ({ path, hash, content })),
    });
  }
  context(ownerId: string, id: string): string {
    const snapshot = this.store.owned<RepositorySnapshot>(
      "snapshot",
      id,
      ownerId,
    );
    if (!snapshot.consentedAt || !snapshot.selectedPaths.length)
      throw new AppError(
        "CONTEXT_CONSENT_REQUIRED",
        "Review and approve the files to send to the model.",
      );
    return this.renderContext(snapshot);
  }
  changes(ownerId: string, id: string, raw: unknown): Artifact[] {
    const snapshot = this.store.owned<RepositorySnapshot>(
      "snapshot",
      id,
      ownerId,
    );
    if (!snapshot.consentedAt)
      throw new AppError(
        "CONTEXT_CONSENT_REQUIRED",
        "Repository context has not been approved.",
      );
    return validateChanges(snapshot, raw).artifacts;
  }
}
