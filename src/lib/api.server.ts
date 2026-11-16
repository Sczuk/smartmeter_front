// Server-only BFF transport: talks to the Register/Energy backends (or mocks),
// attaches the Bearer token from httpOnly cookies and refreshes once on 401.
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { mockHandle } from "./mock.server";
import { assertBackendConfig, isProduction, mocksEnabled } from "./env.server";
import { cookieAttrs, singleFlight, type RefreshResult } from "./session";

export const ACCESS = "sm_at";
export const REFRESH = "sm_rt";
export const REMEMBER = "sm_rm";
const REQUEST_TIMEOUT_MS = 15_000;

type Service = "register" | "energy";
type Res = { status: number; json?: any };

function useMocks() {
  return mocksEnabled();
}

async function transport(service: Service, method: string, path: string, body?: unknown, token?: string): Promise<Res> {
  if (useMocks()) return mockHandle(service, method, path, body, token);
  assertBackendConfig();
  const base = service === "register" ? process.env["REGISTER_API_URL"]! : `${process.env["ENERGY_API_URL"]}/energy-iot`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers["authorization"] = `Bearer ${token}`;
  try {
    const r = await fetch(base.replace(/\/$/, "") + path, {
      method,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await r.text();
    let json: any;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
    return { status: r.status, json };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      console.error("backend request timed out", service, path);
      return { status: 504 };
    }
    console.error("backend unreachable", service, path, e);
    return { status: 503 };
  }
}

function attrs() {
  return cookieAttrs({ production: isProduction(), sameSite: process.env["COOKIE_SAMESITE"], secure: process.env["COOKIE_SECURE"] });
}

export function storeTokens(raw: any, remember?: boolean) {
  const at = raw?.access_token ?? raw?.accessToken;
  const rt = raw?.refresh_token ?? raw?.refreshToken;
  const exp = Number(raw?.expires_in ?? raw?.expiresIn ?? 3600);
  const rexp = Number(raw?.refresh_expires_in ?? raw?.refreshExpiresIn ?? 60 * 60 * 24 * 30);
  if (!at) return false;
  const persist = remember ?? getCookie(REMEMBER) !== "0";
  const base = attrs();
  setCookie(ACCESS, at, { ...base, ...(persist ? { maxAge: exp } : {}) });
  if (rt) setCookie(REFRESH, rt, { ...base, ...(persist ? { maxAge: rexp } : {}) });
  setCookie(REMEMBER, persist ? "1" : "0", { ...base, ...(persist ? { maxAge: rexp } : {}) });
  return true;
}

export function clearTokens() {
  const a = attrs();
  for (const c of [ACCESS, REFRESH, REMEMBER]) deleteCookie(c, a);
}

const sharedRefresh = singleFlight(async (rt): Promise<RefreshResult> => {
  const r = await transport("register", "POST", "/api/auth/refresh", { refresh_token: rt });
  const at = r.json?.access_token ?? r.json?.accessToken;
  if (r.status >= 200 && r.status < 300 && at) return { ok: true, raw: r.json };
  // Only 400/401/403 mean the refresh token is really dead; network/5xx keep the session.
  return { ok: false, definitive: r.status === 400 || r.status === 401 || r.status === 403 };
});

/** Returns the new access token, "keep" on transient failure, or null when the session is dead. */
async function refresh(): Promise<string | null | "keep"> {
  const rt = getCookie(REFRESH);
  if (!rt) return null;
  const res = await sharedRefresh(rt);
  if (res.ok) { storeTokens(res.raw); return res.raw.access_token ?? res.raw.accessToken; }
  return res.definitive ? null : "keep";
}

export class ApiError extends Error {
  constructor(public status: number) { super(status === 401 ? "UNAUTHENTICATED" : `HTTP_${status}`); }
}

/** Authenticated call. Throws ApiError on non-2xx. */
export async function api<T = any>(service: Service, method: string, path: string, body?: unknown): Promise<T> {
  let token = getCookie(ACCESS);
  if (!token && getCookie(REFRESH)) {
    const n = await refresh();
    if (n === "keep") throw new ApiError(503);
    if (n) token = n;
  }
  let r = await transport(service, method, path, body, token);
  if (r.status === 401) {
    const n = await refresh();
    if (n === "keep") throw new ApiError(503);
    if (n) {
      r = await transport(service, method, path, body, n);
    } else {
      clearTokens();
      throw new ApiError(401);
    }
    if (r.status === 401) { clearTokens(); throw new ApiError(401); }
  }
  if (r.status < 200 || r.status >= 300) throw new ApiError(r.status);
  return r.json as T;
}

export async function publicAuth(path: string, body: unknown) {
  return transport("register", "POST", path, body);
}
