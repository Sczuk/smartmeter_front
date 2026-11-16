import { describe, expect, it, vi } from "vitest";
import { cookieAttrs, singleFlight } from "@/lib/session";

describe("cookie attributes", () => {
  it("production uses Secure + SameSite=Lax + HttpOnly + Path=/", () => {
    expect(cookieAttrs({ production: true })).toEqual({ httpOnly: true, path: "/", sameSite: "lax", secure: true });
  });
  it("local HTTP dev allows Secure=false", () => {
    expect(cookieAttrs({ production: false }).secure).toBe(false);
  });
  it("SameSite=None opt-in always forces Secure", () => {
    expect(cookieAttrs({ production: false, sameSite: "none" })).toMatchObject({ sameSite: "none", secure: true });
  });
});

describe("single-flight refresh", () => {
  it("runs one refresh for concurrent callers and shares the result", async () => {
    const fn = vi.fn(async () => ({ ok: true as const, raw: { access_token: "new" } }));
    const go = singleFlight(fn);
    const rs = await Promise.all([go("rt1"), go("rt1"), go("rt1")]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(rs.every((r) => r.ok)).toBe(true);
  });
  it("late caller with the rotated token reuses the success instead of failing", async () => {
    let t = 0;
    const fn = vi.fn(async () => ({ ok: true as const, raw: {} }));
    const go = singleFlight(fn, 15_000, () => t);
    await go("rt1"); t = 5_000;
    expect((await go("rt1")).ok).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("network errors are not treated as a dead session", async () => {
    const go = singleFlight(async () => { throw new Error("down"); });
    expect(await go("rt1")).toEqual({ ok: false, definitive: false });
  });
});
