// Server-only runtime configuration. Never import from client code.
export const REQUIRED_PROD_ENV = ["REGISTER_API_URL", "ENERGY_API_URL"] as const;

export function isProduction(): boolean {
  return import.meta.env.PROD === true || process.env["NODE_ENV"] === "production";
}

/** Mocks only when USE_MOCKS=true AND not production. Missing URLs never enable mocks. */
export function mocksEnabled(): boolean {
  return !isProduction() && process.env["USE_MOCKS"] === "true";
}

export function missingEnv(): string[] {
  return REQUIRED_PROD_ENV.filter((k) => {
    const v = process.env[k];
    if (!v) return true;
    try { const u = new URL(v); return u.protocol !== "http:" && u.protocol !== "https:"; } catch { return true; }
  });
}

export class ConfigError extends Error {
  constructor(missing: string[]) {
    super(`[SmartMeter] Configuração inválida: defina ${missing.join(", ")} com URLs http(s) válidas.`);
    this.name = "ConfigError";
  }
}

/** Throws ConfigError when real backends are needed but URLs are missing/invalid. */
export function assertBackendConfig(): void {
  if (mocksEnabled()) return;
  const missing = missingEnv();
  if (missing.length) throw new ConfigError(missing);
}
