import type { Device, Measurement } from "./types";

export type DeviceRow = Device & { m?: Measurement | undefined };

export function joinDevices(devices: Device[], ms: Measurement[] | undefined): DeviceRow[] {
  const map = new Map((ms ?? []).map((m) => [m.deviceId, m]));
  return devices.map((d) => ({ ...d, m: map.get(d.id) }));
}

/** Sum of powerW of devices whose relay is ONLINE. */
export function currentPower(ms: Measurement[] | undefined) {
  return (ms ?? []).filter((m) => m.state === "ONLINE").reduce((s, m) => s + (Number(m.powerW) || 0), 0);
}

export function newestMeasured(ms: Measurement[] | undefined) {
  let best: string | null = null;
  for (const m of ms ?? []) if (m.measured && (!best || +new Date(m.measured) > +new Date(best))) best = m.measured;
  return best;
}

export function relayCounts(rows: DeviceRow[]) {
  const on = rows.filter((r) => r.m?.state === "ONLINE").length;
  return { on, off: rows.length - on };
}

/** A reading is only displayable when the relay is ONLINE; otherwise "—". */
export function readable(m: Measurement | undefined) {
  return m?.state === "ONLINE";
}
