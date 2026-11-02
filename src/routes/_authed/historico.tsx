import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Cpu, Moon, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, ErrorState, PageHeader, Pill } from "@/components/sm/bits";
import { SmartmeterSelect } from "@/components/sm/SmartmeterSelect";
import { dailyQuery, smartmeterQuery, smartmetersQuery } from "@/lib/queries";
import { fmt2, fmtDateLong, fmtDayMonth, fmtMonthYear, fmtRange, fmtWeekShort, fmtWeekdayLong, listDays, monthWindow, spDateKey, weekWindow } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Search = { sm?: string | undefined; device?: string | undefined; period: "semana" | "mes"; offset: number };

export const Route = createFileRoute("/_authed/historico")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    sm: typeof s["sm"] === "string" ? s["sm"] : undefined,
    device: typeof s["device"] === "string" ? s["device"] : undefined,
    period: s["period"] === "mes" ? "mes" : "semana",
    offset: Math.min(0, Math.trunc(Number(s["offset"]) || 0)),
  }),
  head: () => ({
    meta: [
      { title: "Histórico de consumo — SmartMeter" },
      { name: "description", content: "Compare seus dias e entenda como a energia faz parte da sua rotina." },
      { property: "og:title", content: "Histórico de consumo — SmartMeter" },
      { property: "og:description", content: "Compare seus dias e entenda como a energia faz parte da sua rotina." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/historico" });
  const set = (patch: Partial<Search>) => navigate({ search: (p) => ({ ...p, ...patch }), replace: true });
  const list = useQuery(smartmetersQuery());
  const items = list.data?.smartmeters ?? [];
  const smId = search.sm && items.some((s) => s.id === search.sm) ? search.sm : items[0]?.id ?? "";
  const detail = useQuery(smartmeterQuery(smId));
  const devices = detail.data?.devices ?? [];
  const deviceId = search.device && devices.some((d) => d.id === search.device) ? search.device : undefined;

  const today = spDateKey();
  const win = search.period === "mes" ? monthWindow(search.offset, today) : weekWindow(search.offset, today);
  const daily = useQuery(dailyQuery(smId, win.from, win.to, deviceId));
  const smName = items.find((s) => s.id === smId)?.name ?? "";
  const devName = devices.find((d) => d.id === deviceId)?.deviceName;

  const header = <PageHeader title="O consumo conta uma história." subtitle="Compare seus dias e entenda como a energia faz parte da sua rotina." />;
  if (list.isError) return <>{header}<Card><ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /></Card></>;
  if (!list.isLoading && items.length === 0)
    return <>{header}<Card><EmptyState icon={<Cpu className="h-5 w-5" />} title="Nenhum smartmeter ainda" text="Cadastre uma placa para ver o histórico de consumo."
      action={<Button asChild variant="lime"><Link to="/smartmeters">Adicionar smartmeter</Link></Button>} /></Card></>;

  return (
    <div className="space-y-6">
      {header}
      <Card className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1.4fr_1.3fr_0.9fr_1.9fr]">
        <Filter label="Smartmeter">
          {list.isLoading ? <Skeleton className="h-11" /> : <SmartmeterSelect items={items} value={smId} onChange={(v) => set({ sm: v, device: undefined })} />}
        </Filter>
        <Filter label="Dispositivo">
          <Select value={deviceId ?? "all"} onValueChange={(v) => set({ device: v === "all" ? undefined : v })}>
            <SelectTrigger className="h-11 bg-card text-sm" aria-label="Dispositivo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dispositivos</SelectItem>
              {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.deviceName}</SelectItem>)}
            </SelectContent>
          </Select>
        </Filter>
        <Filter label="Período">
          <div className="grid h-11 grid-cols-2 rounded-lg bg-muted p-1">
            {(["semana", "mes"] as const).map((p) => (
              <button key={p} onClick={() => set({ period: p, offset: 0 })}
                className={cn("rounded-md text-sm", search.period === p ? "bg-card font-semibold shadow-sm" : "text-muted-foreground")}>
                {p === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </Filter>
        <Filter label="Intervalo selecionado">
          <div className="flex h-11 items-center justify-between rounded-lg border border-input px-2">
            <button aria-label="Intervalo anterior" className="rounded p-1 hover:bg-muted" onClick={() => set({ offset: search.offset - 1 })}><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium">{search.period === "mes" ? fmtMonthYear(win.from) : fmtRange(win.from, win.to)}</span>
            <button aria-label="Próximo intervalo" disabled={search.offset >= 0} className="rounded p-1 hover:bg-muted disabled:opacity-30" onClick={() => set({ offset: Math.min(0, search.offset + 1) })}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </Filter>
      </Card>
      <HistoryBody loading={daily.isLoading || list.isLoading} error={daily.isError ? errorMessage(daily.error) : null} onRetry={() => daily.refetch()}
        data={daily.data ?? []} from={win.from} to={win.to} subtitle={`${smName} · ${devName ?? "todos os dispositivos"} · kWh/dia`} />
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><p className="mb-2 text-sm">{label}</p>{children}</div>;
}

function HistoryBody({ loading, error, onRetry, data, from, to, subtitle }: {
  loading: boolean; error: string | null; onRetry: () => void; data: { date: string; kwh: number }[]; from: string; to: string; subtitle: string;
}) {
  const byDay = useMemo(() => new Map(data.map((d) => [d.date, d.kwh])), [data]);
  const days = listDays(from, to);
  const total = data.reduce((s, d) => s + d.kwh, 0);
  const avg = data.length ? total / data.length : null;
  const max = data.length ? data.reduce((a, b) => (b.kwh > a.kwh ? b : a)) : null;
  const lastAvailable = data.length ? data[data.length - 1]!.date : null;
  const chart = days.map((k) => ({ k, kwh: byDay.get(k) ?? null }));
  const many = days.length > 10;

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl bg-forest p-5 text-forest-foreground">
          <div className="flex justify-between text-sm text-forest-foreground/80">Consumo no período<BarChart3 className="h-5 w-5 text-lime" /></div>
          {loading ? <Skeleton className="mt-3 h-10 w-32 bg-forest-foreground/10" /> : <p className="mt-3 text-[34px] font-light tabular">{data.length ? fmt2(total) : "—"} {data.length > 0 && <span className="text-sm text-forest-foreground/70">kWh</span>}</p>}
          <p className="mt-3 text-[11px] text-forest-foreground/80">{data.length} {data.length === 1 ? "dia consolidado" : "dias consolidados"}</p>
        </div>
        <Card className="p-5">
          <div className="flex justify-between text-sm text-muted-foreground">Média diária<CalendarDays className="h-5 w-5" /></div>
          {loading ? <Skeleton className="mt-3 h-10 w-32" /> : <p className="mt-3 text-[34px] font-light tabular">{avg != null ? fmt2(avg) : "—"} {avg != null && <span className="text-sm text-muted-foreground">kWh/dia</span>}</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">No intervalo selecionado</p>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between text-sm text-muted-foreground">Maior consumo diário<TrendingUp className="h-5 w-5" /></div>
          {loading ? <Skeleton className="mt-3 h-10 w-32" /> : <p className="mt-3 text-[34px] font-light tabular">{max ? fmt2(max.kwh) : "—"} {max && <span className="text-sm text-muted-foreground">kWh</span>}</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">{max ? fmtWeekdayLong(max.date) : "Sem dados no intervalo"}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><h2 className="text-lg font-semibold">Consumo por dia</h2><p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p></div>
          <Pill tone="on">Agregação diária</Pill>
        </div>
        {error ? <ErrorState message={error} onRetry={onRetry} /> : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="h-[260px]">
              {loading ? <Skeleton className="h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 20, right: 0, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="k" axisLine={false} tickLine={false} interval={many ? "preserveStartEnd" : 0}
                      tick={({ x, y, payload }) => (
                        <g transform={`translate(${x},${y})`}>
                          <text textAnchor="middle" dy={12} fontSize={10} fill="var(--muted-foreground)">{fmtDayMonth(payload.value)}</text>
                          {!many && <text textAnchor="middle" dy={28} fontSize={10} fill="var(--muted-foreground)">{fmtWeekShort(payload.value)}</text>}
                        </g>
                      )} height={many ? 24 : 40} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <Bar dataKey="kwh" radius={[3, 3, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                      {chart.map((d) => <Cell key={d.k} fill={max && d.k === max.date ? "var(--brand)" : "var(--leaf)"} />)}
                      {!many && <LabelList dataKey="kwh" position="top" formatter={(v: number | null) => (v == null ? "—" : fmt2(v))} style={{ fontSize: 11, fill: "var(--foreground)" }} />}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="lg:border-l lg:border-border lg:pl-6">
              <div className="flex justify-between pb-2 text-[11px] font-semibold uppercase text-muted-foreground"><span>Dia</span><span>Consumo</span></div>
              <div className={cn("space-y-0", many && "max-h-[220px] overflow-y-auto pr-1")}>
                {days.map((k) => {
                  const v = byDay.get(k);
                  return (
                    <div key={k} className="flex justify-between py-1.5 text-xs">
                      <span className="text-muted-foreground">{fmtWeekShort(k)}, {fmtDayMonth(k)}</span>
                      <span className="font-mono">{v != null ? `${fmt2(v)} kWh` : "—"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Total</span><span className="tabular">{data.length ? `${fmt2(total)} kWh` : "—"}</span>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 text-[11px] text-muted-foreground sm:flex-row sm:justify-between">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-leaf" />Consumo diário agregado</span>
          <span>Último dia disponível: {lastAvailable ? fmtDateLong(lastAvailable) : "—"}</span>
        </div>
      </Card>

      <div className="flex gap-4 rounded-xl bg-leaf-soft p-5">
        <Moon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="text-sm font-semibold">O dia termina. Seu histórico se atualiza.</p>
          <p className="mt-1 text-xs text-brand">Semanas e meses usam totais diários em kWh, processados durante a noite. O consumo de hoje aparecerá após a próxima atualização.</p>
        </div>
      </div>
    </>
  );
}
