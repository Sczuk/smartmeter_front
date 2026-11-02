// Server-only BFF transport: talks to the Register/Energy backends (or mocks),
// attaches the Bearer token from httpOnly cookies and refreshes once on 401.
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { mockHandle } from "./mock.server";

export const ACCESS = "sm_at";
export const REFRESH = "sm_rt";
export const REMEMBER = "sm_rm";

type Service = "register" | "energy";
type Res = { status: number; json?: any };

function useMocks() {
  return process.env["USE_MOCKS"] === "true" || !process.env["REGISTER_API_URL"];
}

async function transport(service: Service, method: string, path: string, body?: unknown, token?: string): Promise<Res> {
  if (useMocks()) return mockHandle(service, method, path, body, token);
  const base = service === "register" ? process.env["REGISTER_API_URL"]! : `${process.env["ENERGY_API_URL"]}/energy-iot`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers["authorization"] = `Bearer ${token}`;
  try {
    const r = await fetch(base.replace(/\/$/, "") + path, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const text = await r.text();
    let json: any;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
    return { status: r.status, json };
  } catch (e) {
    console.error("backend unreachable", service, path, e);
    return { status: 503 };
  }
}

export function storeTokens(raw: any, remember?: boolean) {
  const at = raw?.access_token ?? raw?.accessToken;
  const rt = raw?.refresh_token ?? raw?.refreshToken;
  const exp = Number(raw?.expires_in ?? raw?.expiresIn ?? 3600);
  const rexp = Number(raw?.refresh_expires_in ?? raw?.refreshExpiresIn ?? 60 * 60 * 24 * 30);
  if (!at) return false;
  const persist = remember ?? getCookie(REMEMBER) !== "0";
  // Preview runs inside an iframe: cookies must be SameSite=None; Secure to be stored there.
  const base = { httpOnly: true, sameSite: "none" as const, secure: true, path: "/" };
  setCookie(ACCESS, at, { ...base, ...(persist ? { maxAge: exp } : {}) });
  if (rt) setCookie(REFRESH, rt, { ...base, ...(persist ? { maxAge: rexp } : {}) });
  setCookie(REMEMBER, persist ? "1" : "0", { ...base, ...(persist ? { maxAge: rexp } : {}) });
  return true;
}

export function clearTokens() {
  for (const c of [ACCESS, REFRESH, REMEMBER]) deleteCookie(c, { path: "/", sameSite: "none", secure: true });
}

async function refresh(): Promise<boolean> {
  const rt = getCookie(REFRESH);
  if (!rt) return false;
  const r = await transport("register", "POST", "/api/auth/refresh", { refresh_token: rt });
  if (r.status >= 200 && r.status < 300 && storeTokens(r.json)) return true;
  return false;
}

export class ApiError extends Error {
  constructor(public status: number) { super(status === 401 ? "UNAUTHENTICATED" : `HTTP_${status}`); }
}

/** Authenticated call. Throws ApiError on non-2xx. */
export async function api<T = any>(service: Service, method: string, path: string, body?: unknown): Promise<T> {
  let token = getCookie(ACCESS);
  if (!token && getCookie(REFRESH)) { if (await refresh()) token = getCookie(ACCESS); }
  let r = await transport(service, method, path, body, token);
  if (r.status === 401) {
    if (await refresh()) {
      r = await transport(service, method, path, body, getCookie(ACCESS));
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
