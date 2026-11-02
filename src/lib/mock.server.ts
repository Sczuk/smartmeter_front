// In-memory mock of the Register and Energy backends (server-side only).
import type { DeviceType } from "./types";

type MDevice = {
  id: string; name: string; type: DeviceType; channels: number[];
  basePower: number; on: boolean; pending?: { target: boolean; at: number };
};
type MMeter = { id: string; name: string; mac: string; devices: MDevice[]; seed: number };
type MUser = { name: string; email: string; password: string; meters: MMeter[] };

const g = globalThis as unknown as { __smMock?: { users: Map<string, MUser>; tokens: Map<string, string> } };
const store = (g.__smMock ??= { users: new Map(), tokens: new Map() });

const uid = () => crypto.randomUUID();
let pinCursor = 40;

function seedMeters(): MMeter[] {
  const mk = (name: string, type: DeviceType, basePower: number, on: boolean, pins: number[]): MDevice => ({
    id: uid(), name, type, channels: pins, basePower, on,
  });
  return [
    { id: uid(), name: "Casa principal", mac: "24:6F:28:A1:3C:90", seed: 1, devices: [
      mk("Geladeira", "OUTLET", 148, true, [25, 34, 35]),
      mk("Ar-condicionado", "OUTLET", 1100, true, [26, 32, 33]),
      mk("Máquina de lavar", "OUTLET", 520, false, [27, 36, 39]),
      mk("Escritório", "SWITCH", 90, false, [14, 18, 19]),
    ] },
    { id: uid(), name: "Área de serviço", mac: "24:6F:28:A1:3C:A4", seed: 2, devices: [
      mk("Secadora", "OUTLET", 900, false, [25, 34, 35]),
      mk("Ferro de passar", "OUTLET", 1000, false, [26, 32, 33]),
      mk("Luz da lavanderia", "SWITCH", 40, true, [14, 18, 19]),
    ] },
    { id: uid(), name: "Área externa", mac: "24:6F:28:A1:3C:B8", seed: 3, devices: [
      mk("Bomba da piscina", "OUTLET", 750, true, [25, 34, 35]),
      mk("Iluminação do jardim", "SWITCH", 120, true, [14, 18, 19]),
    ] },
  ];
}

store.users.has("demo@smartmeter.app") ||
  store.users.set("demo@smartmeter.app", { name: "Conta Demo", email: "demo@smartmeter.app", password: "smartmeter123", meters: seedMeters() });

type Res = { status: number; json?: unknown };
const ok = (json?: unknown, status = 200): Res => ({ status, json });

function issueTokens(email: string) {
  const access = `mock-a-${uid()}`, refresh = `mock-r-${uid()}`;
  store.tokens.set(access, email);
  store.tokens.set(refresh, email);
  return { access_token: access, refresh_token: refresh, expires_in: 3600, refresh_expires_in: 60 * 60 * 24 * 30, token_type: "Bearer" };
}

function settle(d: MDevice) {
  if (d.pending && Date.now() - d.pending.at >= 5000) { d.on = d.pending.target; d.pending = undefined; }
}

// Deterministic wobble
const wave = (t: number, seed: number) =>
  Math.sin(t / 3.7e6 + seed) * 0.25 + Math.sin(t / 9.1e5 + seed * 2) * 0.1 + Math.sin(t / 2.3e5 + seed * 3) * 0.05;

function devicePowerNow(d: MDevice, seed: number) {
  return Math.max(1, Math.round(d.basePower * (1 + wave(Date.now(), seed + d.basePower) * 0.3)));
}

function powerSeries(m: MMeter, hours: number) {
  const now = Math.floor(Date.now() / 60000) * 60000;
  const out: { at: string; powerW: number }[] = [];
  const gapStart = now - 20 * 3600e3, gapEnd = gapStart + 12 * 60e3;
  const offStart = now - 9 * 3600e3, offEnd = offStart + 30 * 60e3;
  const base = m.devices.reduce((s, d) => s + d.basePower, 0) * 0.55;
  for (let t = now - hours * 3600e3; t <= now; t += 60e3) {
    if (t > gapStart && t < gapEnd) continue;
    const off = t >= offStart && t < offEnd;
    const v = off ? 0 : Math.max(20, base * (1 + wave(t, m.seed)));
    out.push({ at: new Date(t).toISOString(), powerW: Math.round(v) });
  }
  return out;
}

function daily(m: MMeter, from: string, to: string, deviceId?: string) {
  const out: { date: string; kwh: number }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const first = new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10);
  const share = deviceId ? (() => {
    const total = m.devices.reduce((s, d) => s + d.basePower, 0) || 1;
    const d = m.devices.find((x) => x.id === deviceId);
    return d ? d.basePower / total : 0;
  })() : 1;
  for (let k = from; k <= to; k = new Date(Date.parse(k) + 86400e3).toISOString().slice(0, 10)) {
    if (k >= today || k < first) continue;
    const t = Date.parse(k);
    const kwh = (8.3 + wave(t * 40, m.seed) * 3) * share;
    out.push({ date: k, kwh: Math.round(kwh * 100) / 100 });
  }
  return out;
}

export function mockHandle(service: "register" | "energy", method: string, path: string, body: any, token?: string): Res {
  const url = new URL(path, "http://mock");
  const p = url.pathname;
  if (service === "register" && p.startsWith("/api/auth/")) {
    if (p === "/api/auth/login") {
      const u = store.users.get(String(body?.email ?? "").toLowerCase());
      if (!u || u.password !== body?.password) return { status: 401 };
      return ok(issueTokens(u.email));
    }
    if (p === "/api/auth/register") {
      const email = String(body?.email ?? "").toLowerCase();
      if (!email || !body?.password || !body?.name) return { status: 400 };
      if (store.users.has(email)) return { status: 409 };
      store.users.set(email, { name: body.name, email, password: body.password, meters: seedMeters() });
      return ok(issueTokens(email), 201);
    }
    if (p === "/api/auth/refresh") {
      const email = store.tokens.get(body?.refresh_token);
      if (!email) return { status: 401 };
      store.tokens.delete(body.refresh_token);
      return ok(issueTokens(email));
    }
    if (p === "/api/auth/logout") { store.tokens.delete(body?.refresh_token); return { status: 204 }; }
  }
  const email = token ? store.tokens.get(token) : undefined;
  const user = email ? store.users.get(email) : undefined;
  if (!user) return { status: 401 };
  const meter = (id: string) => user.meters.find((m) => m.id === id);
  let r: RegExpMatchArray | null;

  if (service === "register") {
    if (method === "GET" && p === "/api/smartmeter/smartmeters")
      return ok({ name: user.name, smartmeters: user.meters.map((m) => ({ id: m.id, name: m.name, macAddress: m.mac, amountConnectedDevices: m.devices.length })) });
    if (method === "GET" && (r = p.match(/^\/api\/smartmeter\/findSmartmeter\/smartmeterId\/([^/]+)$/))) {
      const m = meter(r[1]); if (!m) return { status: 404 };
      return ok({ id: m.id, name: m.name, macAddress: m.mac, userName: user.name,
        devices: m.devices.map((d) => ({ id: d.id, deviceName: d.name, type: d.type, channels: d.channels, smartmeterName: m.name })) });
    }
    if (method === "POST" && p === "/api/smartmeter/create") {
      if (!body?.name || !body?.macAddress) return { status: 400 };
      if (store.users.size && [...store.users.values()].some((u) => u.meters.some((m) => m.mac === body.macAddress))) return { status: 409 };
      const m: MMeter = { id: uid(), name: body.name, mac: body.macAddress, devices: [], seed: Math.random() * 10 };
      user.meters.push(m);
      return ok({ id: m.id, name: m.name, macAddress: m.mac, userName: user.name }, 201);
    }
    if (method === "DELETE" && (r = p.match(/^\/api\/smartmeter\/deleteSmartmeter\/smartmeterId\/([^/]+)$/))) {
      const i = user.meters.findIndex((m) => m.id === r![1]); if (i < 0) return { status: 404 };
      user.meters.splice(i, 1); return { status: 204 };
    }
    if (method === "POST" && (r = p.match(/^\/api\/device\/smartmeterId\/([^/]+)\/create$/))) {
      const m = meter(r[1]); if (!m) return { status: 404 };
      if (!body?.name || !["OUTLET", "SWITCH"].includes(body?.type)) return { status: 400 };
      const d: MDevice = { id: uid(), name: body.name, type: body.type, channels: [pinCursor++, pinCursor++, pinCursor++], basePower: body.type === "SWITCH" ? 60 : 300, on: false };
      m.devices.push(d);
      return ok({ id: d.id, deviceName: d.name, type: d.type, channels: d.channels, smartmeterName: m.name }, 201);
    }
    if (method === "DELETE" && (r = p.match(/^\/api\/device\/delete\/deviceId\/([^/]+)\/smartmeterId\/([^/]+)$/))) {
      const m = meter(r[2]); if (!m) return { status: 404 };
      const i = m.devices.findIndex((d) => d.id === r![1]); if (i < 0) return { status: 404 };
      m.devices.splice(i, 1); return { status: 204 };
    }
    return { status: 404 };
  }

  // energy (paths relative to /energy-iot)
  if ((r = p.match(/^\/measurements\/smartmeter\/([^/]+)\/devices\/latest$/))) {
    const m = meter(r[1]); if (!m) return { status: 404 };
    const measured = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    return ok({ measurements: m.devices.filter((d) => d.basePower !== 300 && d.basePower !== 60 || d.on || d.pending).map((d) => {
      settle(d);
      const w = d.on ? devicePowerNow(d, m.seed) : 0;
      return { deviceId: d.id, smartmeterId: m.id, voltageV: d.on ? 220 : 0, currentA: d.on ? Math.round((w / 220) * 100) / 100 : 0, powerW: w, state: d.on ? "ONLINE" : "OFFLINE", measured };
    }) });
  }
  if ((r = p.match(/^\/measurements\/smartmeter\/([^/]+)\/power$/))) {
    const m = meter(r[1]); if (!m) return { status: 404 };
    return ok(powerSeries(m, Number(url.searchParams.get("hours") ?? 48)));
  }
  if ((r = p.match(/^\/measurements\/smartmeter\/([^/]+)\/consumption\/daily$/))) {
    const m = meter(r[1]); if (!m) return { status: 404 };
    return ok(daily(m, url.searchParams.get("from")!, url.searchParams.get("to")!, url.searchParams.get("deviceId") || undefined));
  }
  if (method === "POST" && (r = p.match(/^\/devices\/control\/(turnOn|turnOff)\/([^/]+)$/))) {
    const d = user.meters.flatMap((m) => m.devices).find((x) => x.id === r![2]);
    if (!d) return { status: 404 };
    d.pending = { target: r[1] === "turnOn", at: Date.now() };
    return { status: 202 };
  }
  return { status: 404 };
}
