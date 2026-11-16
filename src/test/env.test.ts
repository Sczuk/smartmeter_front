import { afterEach, describe, expect, it, vi } from "vitest";
import { assertBackendConfig, mocksEnabled } from "@/lib/env.server";

afterEach(() => vi.unstubAllEnvs());

describe("mock gating", () => {
  it("missing REGISTER_API_URL does not enable mocks", () => {
    vi.stubEnv("USE_MOCKS", ""); vi.stubEnv("REGISTER_API_URL", "");
    expect(mocksEnabled()).toBe(false);
  });
  it("USE_MOCKS=true enables mocks outside production", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("USE_MOCKS", "true");
    expect(mocksEnabled()).toBe(true);
  });
  it("USE_MOCKS=true is ignored in production", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("USE_MOCKS", "true");
    expect(mocksEnabled()).toBe(false);
  });
  it("production without backend URLs throws a config error", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("REGISTER_API_URL", ""); vi.stubEnv("ENERGY_API_URL", "");
    expect(() => assertBackendConfig()).toThrow(/REGISTER_API_URL, ENERGY_API_URL/);
  });
});
