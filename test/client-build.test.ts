import { expect, it } from "vitest";
import { build } from "vite";

it("loads wallet code with the initial page so later deployments cannot break payment actions", async () => {
  const result = await build({
    logLevel: "silent",
    build: { write: false, minify: false },
  });
  if (!("output" in result)) throw new Error("Expected one client build");
  const chunks = result.output.filter((item) => item.type === "chunk");
  const wallet = chunks.find((chunk) =>
    Object.keys(chunk.modules).some((id) =>
      id.endsWith("/src/client/wallet/payment.ts"),
    ),
  );
  expect(
    wallet,
    "Wallet implementation must be present in the build",
  ).toBeDefined();
  const loaded = new Set<string>();
  function visit(name: string) {
    if (loaded.has(name)) return;
    loaded.add(name);
    chunks.find((chunk) => chunk.fileName === name)?.imports.forEach(visit);
  }
  chunks
    .filter((chunk) => chunk.isEntry)
    .forEach((chunk) => visit(chunk.fileName));
  expect(
    loaded.has(wallet!.fileName),
    "Wallet code is deferred until a user action; its hashed file can disappear after a deployment",
  ).toBe(true);
});
