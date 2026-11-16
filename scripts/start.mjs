// Production entry for Railway: validate required config, then boot the Nitro Node server.
const required = ["REGISTER_API_URL", "ENERGY_API_URL"];
const invalid = required.filter((k) => {
  try { return !/^https?:$/.test(new URL(process.env[k] ?? "").protocol); } catch { return true; }
});
if (invalid.length) {
  console.error(`[SmartMeter] Configuração inválida: defina ${invalid.join(", ")} com URLs http(s) válidas. Servidor não iniciado.`);
  process.exit(1);
}
if (process.env.USE_MOCKS === "true") console.warn("[SmartMeter] USE_MOCKS ignorado em produção.");
process.env.NODE_ENV = "production";
await import("../.output/server/index.mjs");
