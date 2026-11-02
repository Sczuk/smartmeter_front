import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { ACCESS, REFRESH, api, clearTokens, publicAuth, storeTokens } from "./api.server";
import type { DailyPoint, DeviceType, Measurement, PowerPoint, SmartmeterDetail, SmartmeterList } from "./types";

const enc = encodeURIComponent;

export const hasSession = createServerFn({ method: "GET" }).handler(async () => {
  return { authed: Boolean(getCookie(ACCESS) || getCookie(REFRESH)) };
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; remember: boolean }) => d)
  .handler(async ({ data }) => {
    const r = await publicAuth("/api/auth/login", { email: data.email.trim(), password: data.password });
    if (r.status >= 200 && r.status < 300 && storeTokens(r.json, data.remember)) return { ok: true as const };
    return { ok: false as const, status: r.status };
  });

export const register = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const r = await publicAuth("/api/auth/register", { name: data.name.trim(), email: data.email.trim(), password: data.password });
    if (r.status >= 200 && r.status < 300 && storeTokens(r.json, true)) return { ok: true as const };
    return { ok: false as const, status: r.status };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const rt = getCookie(REFRESH);
  if (rt) await publicAuth("/api/auth/logout", { refresh_token: rt }).catch(() => undefined);
  clearTokens();
  return { ok: true };
});

export const listSmartmeters = createServerFn({ method: "GET" }).handler(() =>
  api<SmartmeterList>("register", "GET", "/api/smartmeter/smartmeters"),
);

export const getSmartmeter = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(({ data }) => api<SmartmeterDetail>("register", "GET", `/api/smartmeter/findSmartmeter/smartmeterId/${enc(data.id)}`));

export const createSmartmeter = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; macAddress: string }) => d)
  .handler(({ data }) => api("register", "POST", "/api/smartmeter/create", { name: data.name.trim(), macAddress: data.macAddress.trim().toUpperCase() }));

export const deleteSmartmeter = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => { await api("register", "DELETE", `/api/smartmeter/deleteSmartmeter/smartmeterId/${enc(data.id)}`); return { ok: true }; });

export const createDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { smartmeterId: string; name: string; type: DeviceType }) => d)
  .handler(({ data }) => api("register", "POST", `/api/device/smartmeterId/${enc(data.smartmeterId)}/create`, { name: data.name.trim(), type: data.type }));

export const deleteDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { smartmeterId: string; deviceId: string }) => d)
  .handler(async ({ data }) => {
    await api("register", "DELETE", `/api/device/delete/deviceId/${enc(data.deviceId)}/smartmeterId/${enc(data.smartmeterId)}`);
    return { ok: true };
  });

export const getLatest = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const r = await api<{ measurements: Measurement[] }>("energy", "GET", `/measurements/smartmeter/${enc(data.id)}/devices/latest`);
    return r?.measurements ?? [];
  });

export const getPower = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; hours: number }) => d)
  .handler(async ({ data }) => (await api<PowerPoint[]>("energy", "GET", `/measurements/smartmeter/${enc(data.id)}/power?hours=${data.hours}`)) ?? []);

export const getDaily = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; from: string; to: string; deviceId?: string }) => d)
  .handler(async ({ data }) => {
    const q = new URLSearchParams({ from: data.from, to: data.to });
    if (data.deviceId) q.set("deviceId", data.deviceId);
    const r = (await api<DailyPoint[]>("energy", "GET", `/measurements/smartmeter/${enc(data.id)}/consumption/daily?${q}`)) ?? [];
    return r.map((p) => ({ date: p.date.slice(0, 10).replace(/\//g, "-"), kwh: p.kwh }));
  });

export const sendCommand = createServerFn({ method: "POST" })
  .inputValidator((d: { deviceId: string; on: boolean }) => d)
  .handler(async ({ data }) => {
    await api("energy", "POST", `/devices/control/${data.on ? "turnOn" : "turnOff"}/${enc(data.deviceId)}`);
    return { sent: true };
  });
