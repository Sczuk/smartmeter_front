// Pure session helpers (cookie attributes + single-flight refresh). Server-side use only; no secrets here.
export type CookieAttrs = { httpOnly: true; path: "/"; sameSite: "lax" | "none"; secure: boolean };

/**
 * Production: Secure + SameSite=Lax (first-party). Local HTTP dev: Secure=false.
 * COOKIE_SAMESITE=none is an explicit opt-in for embedded previews (forces Secure, as browsers require).
 */
export function cookieAttrs(env: { production: boolean; sameSite?: string | undefined; secure?: string | undefined }): CookieAttrs {
  const sameSite = env.sameSite?.toLowerCase() === "none" ? "none" : "lax";
  const secure = env.production || sameSite === "none" || env.secure === "true";
  return { httpOnly: true, path: "/", sameSite, secure };
}

export type RefreshResult = { ok: true; raw: any } | { ok: false; definitive: boolean };

/**
 * One refresh per refresh token at a time. Concurrent callers share the in-flight promise; a
 * successful result is kept for `graceMs` so late callers holding the now-rotated token reuse it
 * instead of failing and wiping the freshly renewed session.
 */
export function singleFlight(fn: (rt: string) => Promise<RefreshResult>, graceMs = 15_000, now = () => Date.now()) {
  const inflight = new Map<string, Promise<RefreshResult>>();
  const recent = new Map<string, { at: number; res: RefreshResult }>();
  return (rt: string): Promise<RefreshResult> => {
    const hit = recent.get(rt);
    if (hit && now() - hit.at < graceMs) return Promise.resolve(hit.res);
    if (hit) recent.delete(rt);
    const cur = inflight.get(rt);
    if (cur) return cur;
    const p = fn(rt)
      .catch((): RefreshResult => ({ ok: false, definitive: false }))
      .then((res) => {
        inflight.delete(rt);
        if (res.ok) recent.set(rt, { at: now(), res });
        return res;
      });
    inflight.set(rt, p);
    return p;
  };
}
