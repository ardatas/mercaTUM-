import { afterEach, describe, expect, it } from "vitest";
import { applyPatch } from "diff";
import { Store, digest } from "../src/server/tasks/store.js";
import {
  RepositoryService,
  REPOSITORY_LIMITS,
  safePath,
  validateChanges,
} from "../src/server/repos/service.js";
import type { RepositorySnapshot } from "../src/shared/contracts.js";

const sha = "a".repeat(40),
  treeSha = "b".repeat(40),
  blobSha = "c".repeat(40);
function snapshot(): RepositorySnapshot {
  const content = "export const count = 1;\n";
  return {
    id: "snapshot",
    ownerId: "buyer",
    owner: "example",
    repository: "repo",
    requestedRef: "main",
    commitSha: sha,
    files: [
      {
        path: "src/count.ts",
        hash: digest(content),
        bytes: Buffer.byteLength(content),
        content,
      },
    ],
    excluded: ["linked-dir", ".env"],
    selectedPaths: ["src/count.ts"],
    consentedAt: new Date().toISOString(),
  };
}
const stores: Store[] = [];
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});
function mockRepository(
  options: {
    files?: { path: string; mode?: string; content?: string; size?: number }[];
    truncated?: boolean;
  } = {},
) {
  const store = new Store(":memory:");
  stores.push(store);
  const requests: { url: string; init?: RequestInit }[] = [];
  const files = options.files ?? [
    { path: "src/count.ts", content: "export const count = 1;\n" },
  ];
  const fetcher: typeof fetch = async (url, init) => {
    const target = String(url);
    requests.push({ url: target, init });
    if (target === "https://api.github.com/repos/example/repo")
      return Response.json({ private: false });
    if (target.includes("/commits/"))
      return Response.json({ sha, commit: { tree: { sha: treeSha } } });
    if (target.includes(`/git/trees/${treeSha}`))
      return Response.json({
        truncated: options.truncated ?? false,
        tree: files.map((f, i) => ({
          path: f.path,
          type: "blob",
          mode: f.mode ?? "100644",
          sha: i.toString(16).padStart(40, "0"),
          size: f.size ?? Buffer.byteLength(f.content ?? ""),
        })),
      });
    if (target.includes("/git/blobs/")) {
      const f = files[Number.parseInt(target.split("/").at(-1)!, 16)];
      return Response.json({
        encoding: "base64",
        size: Buffer.byteLength(f.content ?? ""),
        content: Buffer.from(f.content ?? "").toString("base64"),
      });
    }
    throw new Error("Unexpected URL");
  };
  return {
    service: new RepositoryService(store, { fetch: fetcher }),
    requests,
    store,
  };
}

describe("public repository importer", () => {
  it("pins the ref before loading file blobs and requires explicit context selection", async () => {
    const { service, requests } = mockRepository();
    const result = await service.import("buyer", {
      owner: "example",
      repository: "repo",
      ref: "feature/demo",
    });
    expect(result.commitSha).toBe(sha);
    expect(result).not.toHaveProperty("ownerId");
    expect(requests.map((r) => r.url)).toEqual([
      "https://api.github.com/repos/example/repo",
      "https://api.github.com/repos/example/repo/commits/feature%2Fdemo",
      `https://api.github.com/repos/example/repo/git/trees/${treeSha}?recursive=1`,
      "https://api.github.com/repos/example/repo/git/blobs/" + "0".repeat(40),
    ]);
    expect(requests.every((r) => r.init?.redirect === "error")).toBe(true);
    expect(() => service.context("buyer", result.id)).toThrow(/approve/);
    service.consent("buyer", result.id, ["src/count.ts"]);
    expect(JSON.parse(service.context("buyer", result.id)).files[0].hash).toBe(
      digest("export const count = 1;\n"),
    );
    expect(() => service.publicSnapshot("attacker", result.id)).toThrow(
      /unavailable/,
    );
  });
  it("excludes protected files, symlinks and detected secrets before preview and model context", async () => {
    const { service, requests } = mockRepository({
      files: [
        { path: ".env", content: "private" },
        { path: "linked-dir", mode: "120000", content: "/private" },
        {
          path: "src/leak.ts",
          content: "const api_key = 'abcdefghijklmnopqrstuvwx';",
        },
        { path: "safe.md", content: "Hello" },
      ],
    });
    const result = await service.import("buyer", {
      owner: "example",
      repository: "repo",
      ref: "main",
    });
    expect(result.files.map((f) => f.path)).toEqual(["safe.md"]);
    expect(result.excluded).toEqual([".env", "linked-dir", "src/leak.ts"]);
    expect(requests.filter((r) => r.url.includes("/git/blobs/"))).toHaveLength(
      2,
    );
  });
  it("rejects oversized or truncated repositories rather than silently dropping files", async () => {
    const { service } = mockRepository({ truncated: true });
    await expect(
      service.import("buyer", {
        owner: "example",
        repository: "repo",
        ref: "main",
      }),
    ).rejects.toMatchObject({ code: "REPO_LIMIT_EXCEEDED" });
    const second = mockRepository({
      files: [{ path: "large.txt", size: REPOSITORY_LIMITS.fileBytes + 1 }],
    });
    await expect(
      second.service.import("buyer", {
        owner: "example",
        repository: "repo",
        ref: "main",
      }),
    ).rejects.toMatchObject({ code: "REPO_LIMIT_EXCEEDED" });
  });
  it("rejects non-GitHub URL injection without making any requests", async () => {
    const { service, requests } = mockRepository();
    await expect(
      service.import("buyer", {
        owner: "https://internal",
        repository: "repo",
        ref: "main",
      }),
    ).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
  it("preserves byte-order marks in pinned hashes and patch base content", async () => {
    const content = "\ufeffconst value = 1;\r\n";
    const { service } = mockRepository({
      files: [{ path: "bom.ts", content }],
    });
    const result = await service.import("buyer", {
      owner: "example",
      repository: "repo",
      ref: "main",
    });
    expect(result.files[0]).toMatchObject({
      content,
      hash: digest(content),
      bytes: Buffer.byteLength(content),
    });
  });
  it("makes consent immutable and bounds serialized context bytes", async () => {
    const { service } = mockRepository({
      files: [
        { path: "one.txt", content: "first" },
        { path: "two.txt", content: "second" },
      ],
    });
    const result = await service.import("buyer", {
      owner: "example",
      repository: "repo",
      ref: "main",
    });
    service.consent("buyer", result.id, ["one.txt"]);
    expect(() => service.consent("buyer", result.id, ["two.txt"])).toThrow(
      /new snapshot/,
    );
    const large = mockRepository({
      files: [
        {
          path: "large.txt",
          content: "x".repeat(REPOSITORY_LIMITS.contextBytes),
        },
      ],
    });
    const largeResult = await large.service.import("buyer", {
      owner: "example",
      repository: "repo",
      ref: "main",
    });
    expect(() =>
      large.service.consent("buyer", largeResult.id, ["large.txt"]),
    ).toThrow(/48,000/);
  });
});

describe("validated repository artifacts", () => {
  it("generates an actual patch that applies to the pinned base without changing that base", () => {
    const base = snapshot(),
      newContent = "export const count = 2;\n";
    const result = validateChanges(base, {
      summary: "Update count.",
      changes: [
        {
          path: "src/count.ts",
          operation: "replace",
          expectedBaseHash: base.files[0].hash,
          newContent,
        },
      ],
    });
    expect(applyPatch(base.files[0].content, result.artifacts[0].content)).toBe(
      newContent,
    );
    expect(result.artifacts[1].content).toBe(newContent);
    expect(base.files[0].content).toBe("export const count = 1;\n");
    expect(result.files[0].hash).toBe(digest(newContent));
  });
  it.each([
    "../escape",
    "/absolute",
    "src/../../escape",
    "C:/private",
    "src\\escape",
    ".env.local",
    ".github/workflows/deploy.yml",
    "id_rsa",
    "src\0bad",
    "node_modules/index.js",
  ])("rejects protected or escaping path %s", (path) => {
    expect(safePath(path)).toBe(false);
    expect(() =>
      validateChanges(snapshot(), {
        summary: "Bad path.",
        changes: [{ path, operation: "create", newContent: "bad" }],
      }),
    ).toThrow();
  });
  it("rejects stale hashes, unselected edits, duplicate files and excluded symlink descendants", () => {
    const base = snapshot();
    expect(() =>
      validateChanges(base, {
        summary: "Stale.",
        changes: [
          {
            path: "src/count.ts",
            operation: "replace",
            expectedBaseHash: "f".repeat(64),
            newContent: "x",
          },
        ],
      }),
    ).toThrow(/hashes/);
    expect(() =>
      validateChanges(
        { ...base, selectedPaths: [] },
        {
          summary: "Not consented.",
          changes: [
            {
              path: "src/count.ts",
              operation: "delete",
              expectedBaseHash: base.files[0].hash,
            },
          ],
        },
      ),
    ).toThrow(/hashes/);
    expect(() =>
      validateChanges(base, {
        summary: "Duplicate.",
        changes: [
          { path: "new.ts", operation: "create", newContent: "x" },
          { path: "new.ts", operation: "create", newContent: "y" },
        ],
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      validateChanges(base, {
        summary: "Symlink.",
        changes: [
          {
            path: "linked-dir/escape.ts",
            operation: "create",
            newContent: "x",
          },
        ],
      }),
    ).toThrow(/protected/);
  });
  it("rejects oversized output, leaked credentials and malformed operations", () => {
    expect(() =>
      validateChanges(snapshot(), {
        summary: "Large.",
        changes: [
          {
            path: "large.txt",
            operation: "create",
            newContent: "x".repeat(REPOSITORY_LIMITS.fileBytes + 1),
          },
        ],
      }),
    ).toThrow(/limits/);
    expect(() =>
      validateChanges(snapshot(), {
        summary: "Key.",
        changes: [
          {
            path: "config.ts",
            operation: "create",
            newContent: "const secret = 'abcdefghijklmnopqrstuvwxyz';",
          },
        ],
      }),
    ).toThrow(/sensitive/);
    expect(() =>
      validateChanges(snapshot(), {
        summary: "Missing content.",
        changes: [{ path: "new.ts", operation: "create" }],
      }),
    ).toThrow(/content/);
  });
});
