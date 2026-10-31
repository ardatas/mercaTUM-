let csrf = "";
export async function startSession() {
  const r = await fetch("/api/session");
  if (!r.ok) throw new Error("Could not open your workspace.");
  csrf = (await r.json()).csrf;
}
export async function api<T = any>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  key = crypto.randomUUID(),
): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      "X-CSRF-Token": csrf,
      "Idempotency-Key": key,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      data.error?.message ?? "The request could not be completed.",
    );
  return data;
}
