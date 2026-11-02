import { describe, expect, it } from "vitest";
import { fmt2, fmtDateLong, fmtInt, isValidMac, monthWindow, normalizeMac, weekWindow, withGaps } from "@/lib/format";
import { currentPower } from "@/lib/devices";
import type { Measurement } from "@/lib/types";

const m = (state: string, powerW: number): Measurement => ({ deviceId: "x", smartmeterId: "s", voltageV: 220, currentA: 1, powerW, state, measured: new Date().toISOString() });

describe("domain rules", () => {
  it("formats numbers and dates in pt-BR", () => {
    expect(fmtInt(1248)).toBe("1.248");
    expect(fmt2(8.42)).toBe("8,42");
    expect(fmtDateLong("2026-10-20")).toBe("20 out. 2026");
  });
  it("current power sums only ONLINE relays", () => {
    expect(currentPower([m("ONLINE", 148), m("ONLINE", 1100), m("OFFLINE", 0), m("WEIRD", 50)])).toBe(1248);
  });
  it("validates and uppercases MAC", () => {
    expect(isValidMac("24:6f:28:a1:3c:90")).toBe(true);
    expect(normalizeMac("24:6f:28:a1:3c:90")).toBe("24:6F:28:A1:3C:90");
    expect(isValidMac("24-6F-28-A1-3C-90")).toBe(false);
  });
  it("breaks the power line on gaps longer than 2 minutes", () => {
    const pts = [{ at: "2026-01-01T00:00:00Z", powerW: 1 }, { at: "2026-01-01T00:01:00Z", powerW: 2 }, { at: "2026-01-01T00:13:00Z", powerW: 3 }];
    expect(withGaps(pts).map((p) => p.powerW)).toEqual([1, 2, null, 3]);
  });
  it("week window is 7 days ending yesterday; month clamps to yesterday", () => {
    expect(weekWindow(0, "2026-10-20")).toEqual({ from: "2026-10-13", to: "2026-10-19" });
    expect(weekWindow(-1, "2026-10-20")).toEqual({ from: "2026-10-06", to: "2026-10-12" });
    expect(monthWindow(0, "2026-10-20")).toEqual({ from: "2026-10-01", to: "2026-10-19" });
    expect(monthWindow(-1, "2026-10-20")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
});
