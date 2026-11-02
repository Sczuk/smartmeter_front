// Pure pt-BR formatting and domain helpers (client + server safe).
export const TZ = "America/Sao_Paulo";

const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEK_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEK_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) => nf0.format(Math.round(n));
export const fmt2 = (n: number) => nf2.format(n);
export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Parts of an instant in São Paulo time. */
export function spParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** yyyy-MM-dd for an instant in São Paulo. */
export function spDateKey(d: Date = new Date()) {
  const { year, month, day } = spParts(d);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Accept yyyy-MM-dd or yyyy/MM/dd. */
export function normalizeDateKey(s: string) {
  return s.slice(0, 10).replace(/\//g, "-");
}

function keyToUTC(key: string) {
  const [y, m, d] = normalizeDateKey(key).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function addDays(key: string, n: number) {
  const d = keyToUTC(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string) {
  return Math.round((keyToUTC(to).getTime() - keyToUTC(from).getTime()) / 86400000);
}
export function listDays(from: string, to: string) {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}
export function weekday(key: string) {
  return keyToUTC(key).getUTCDay();
}

/** "20 out. 2026" */
export function fmtDateLong(key: string) {
  const d = keyToUTC(key);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "19 out." */
export function fmtDayMonth(key: string) {
  const d = keyToUTC(key);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export const fmtWeekShort = (key: string) => WEEK_SHORT[weekday(key)];
/** "Quinta-feira, 15 de outubro" */
export function fmtWeekdayLong(key: string) {
  const d = keyToUTC(key);
  return `${WEEK_LONG[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS_LONG[d.getUTCMonth()]}`;
}
export function fmtMonthYear(key: string) {
  const d = keyToUTC(key);
  const m = MONTHS_LONG[d.getUTCMonth()];
  return `${m[0].toUpperCase()}${m.slice(1)} ${d.getUTCFullYear()}`;
}
/** "13 – 19 out. 2026" (handles month/year changes) */
export function fmtRange(from: string, to: string) {
  const a = keyToUTC(from), b = keyToUTC(to);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${fmtDateLong(from)} – ${fmtDateLong(to)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${fmtDayMonth(from)} – ${fmtDateLong(to)}`;
  return `${a.getUTCDate()} – ${fmtDateLong(to)}`;
}
/** "14:05" in São Paulo */
export function fmtTime(iso: string | number) {
  const { hour, minute } = spParts(new Date(iso));
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function minutesAgo(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}
export const STALE_MS = 3 * 60 * 1000;
export const isStale = (iso: string, now = Date.now()) => now - new Date(iso).getTime() > STALE_MS;

export const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
export const normalizeMac = (s: string) => s.trim().toUpperCase();
export const isValidMac = (s: string) => MAC_RE.test(normalizeMac(s));

export const shortId = (id: string) => (id.length > 8 ? `${id.slice(0, 8)}…` : id);

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Insert null breaks where consecutive samples are more than 2 min apart (no interpolation). */
export function withGaps(points: { at: string; powerW: number }[], maxGapMs = 2 * 60 * 1000) {
  const sorted = [...points].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const out: { t: number; powerW: number | null }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = +new Date(sorted[i].at);
    if (i > 0) {
      const prev = +new Date(sorted[i - 1].at);
      if (t - prev > maxGapMs) out.push({ t: prev + 1, powerW: null });
    }
    out.push({ t, powerW: sorted[i].powerW });
  }
  return out;
}

/** Week window ending yesterday shifted by `offset` weeks. */
export function weekWindow(offset: number, today = spDateKey()) {
  const to = addDays(today, -1 + offset * 7);
  return { from: addDays(to, -6), to };
}
/** Calendar month shifted by `offset`, clamped to yesterday. */
export function monthWindow(offset: number, today = spDateKey()) {
  const yesterday = addDays(today, -1);
  const [y, m] = yesterday.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  const from = d.toISOString().slice(0, 10);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to: last > yesterday ? yesterday : last };
}
