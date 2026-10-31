import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { Store, digest, newId, now } from "./tasks/store.js";
import { AppError } from "../shared/contracts.js";
import type { Config } from "./config.js";
interface Session {
  id: string;
  ownerId: string;
  csrf: string;
  expires: number;
}
interface Token {
  id: string;
  ownerId: string;
  hash: string;
  createdAt: string;
  revoked: boolean;
}
export function auth(store: Store, config: Config) {
  const cookieName =
    config.NODE_ENV === "production" ? "__Host-mercatum" : "mercatum";
  const secret = config.SESSION_SECRET || "development-cookie-signature";
  const sign = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  const session = (req: Request) => {
    const raw = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    if (!raw) return;
    const [token, sig] = raw.split(".");
    const expected = sign(token ?? "");
    if (
      !sig ||
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return;
    const s = store.get<Session>("session", digest(token));
    return s && s.expires > Date.now() ? s : undefined;
  };
  return {
    session(req: Request, res: Response) {
      let s = session(req);
      if (!s) {
        const token = randomBytes(32).toString("hex");
        s = {
          id: digest(token),
          ownerId: newId(),
          csrf: randomBytes(24).toString("hex"),
          expires: Date.now() + 30 * 86400000,
        };
        store.put("session", s);
        res.cookie(cookieName, `${token}.${sign(token)}`, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 30 * 86400000,
        });
      }
      res.json({ csrf: s.csrf });
    },
    browser(req: Request, res: Response, next: NextFunction) {
      const s = session(req);
      if (!s)
        throw new AppError(
          "UNAUTHORIZED",
          "Open the workspace to begin a session.",
          401,
        );
      if (!["GET", "HEAD"].includes(req.method)) {
        if (
          req.headers.origin !== new URL(config.PUBLIC_APP_URL).origin ||
          req.headers["x-csrf-token"] !== s.csrf
        )
          throw new AppError(
            "FORBIDDEN",
            "This request needs same-origin approval.",
            403,
          );
      }
      res.locals.ownerId = s.ownerId;
      next();
    },
    mcp(req: Request, res: Response, next: NextFunction) {
      if (
        req.headers.origin &&
        req.headers.origin !== new URL(config.PUBLIC_APP_URL).origin
      )
        throw new AppError("FORBIDDEN", "Untrusted request origin.", 403);
      const raw = req.headers.authorization?.match(/^Bearer ([\w-]{43})$/)?.[1];
      const token = raw
        ? store
            .list<Token>("token")
            .find((t) => !t.revoked && t.hash === digest(raw))
        : undefined;
      if (!token)
        throw new AppError(
          "UNAUTHORIZED",
          "A valid workspace MCP token is required.",
          401,
        );
      res.locals.ownerId = token.ownerId;
      next();
    },
    issue(ownerId: string) {
      if (
        store.list<Token>("token", ownerId).filter((t) => !t.revoked).length >=
        10
      )
        throw new AppError("TOKEN_LIMIT", "Revoke an unused token first.", 429);
      const raw = randomBytes(32).toString("base64url");
      const token: Token = {
        id: newId(),
        ownerId,
        hash: digest(raw),
        createdAt: now(),
        revoked: false,
      };
      store.put("token", token);
      return { id: token.id, token: raw, createdAt: token.createdAt };
    },
    list(owner: string) {
      return store
        .list<Token>("token", owner)
        .map(({ id, createdAt, revoked }) => ({ id, createdAt, revoked }));
    },
    revoke(owner: string, id: string) {
      const token = store.owned<Token>("token", id, owner);
      token.revoked = true;
      store.put("token", token);
    },
  };
}
export function rateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; until: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = res.locals.ownerId ?? req.ip ?? "unknown";
    const time = Date.now();
    if (hits.size > 10000)
      for (const [k, v] of hits) if (v.until < time) hits.delete(k);
    let v = hits.get(key);
    if (!v || v.until < time) {
      v = { count: 0, until: time + windowMs };
      hits.set(key, v);
    }
    if (++v.count > limit)
      throw new AppError(
        "RATE_LIMITED",
        "Too many requests. Try again later.",
        429,
        true,
      );
    next();
  };
}
