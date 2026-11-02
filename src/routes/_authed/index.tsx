import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BarChart3, Cpu, Plug, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, DeviceIcon, EmptyState, ErrorState, Footnote, PageHeader, Pill } from "@/components/sm/bits";
import { SmartmeterSelect } from "@/components/sm/SmartmeterSelect";
import { latestQuery, powerQuery, smartmeterQuery, smartmetersQuery, dailyQuery } from "@/lib/queries";
import { currentPower, joinDevices, newestMeasured, relayCounts } from "@/lib/devices";
import { addDays, fmt2, fmtDayMonth, fmtInt, fmtTime, isStale, minutesAgo, spDateKey, withGaps } from "@/lib/format";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authed/")({
  validateSearch: (s: Record<string, unknown>): { sm?: string } => (typeof s.sm === "string" ? { sm: s.sm } : {}),
  head: () => ({
    meta: [
      { title: "Visão geral — SmartMeter" },
      { name: "description", content: "Potência atual, consumo diário e dispositivos da sua casa." },
      { property: "og:title", content: "Visão geral — SmartMeter" },
      { property: "og:description", content: "Potência atual, consumo diário e dispositivos da sua casa." },
    ],
  }),
  component: Overview,
});

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function Overview() {
  const { sm } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const list = useQuery(smartmetersQuery());
  const items = list.data?.smartmeters ?? [];
  const id = sm && items.some((s) => s.id === sm) ? sm : items[0]?.id ?? "";

  const header = (
    <PageHeader title="Sua energia, de perto." subtitle="Um retrato do consumo e dos dispositivos da sua casa."
      action={items.length > 0 && <SmartmeterSelect className="w-full sm:w-[255px]" items={items} value={id}
        onChange={(v) => navigate({ search: { sm: v }, replace: true })} />} />
  );

  if (list.isError) return <>{header}<Card><ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /></Card></>;
  if (list.isLoading) return <>{header}<div className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[150px] rounded-xl" />)}</div></>;
  if (items.length === 0)
    return <>{header}<Card><EmptyState icon={<Cpu className="h-5 w-5" />} title="Nenhum smartmeter ainda"
      text="Cadastre sua primeira placa para começar a acompanhar sua energia."
      action={<Button asChild variant="lime"><Link to="/smartmeters">Adicionar smartmeter</Link></Button>} /></Card></>;

  return <>{header}<OverviewBody id={id} /></>;
}

function OverviewBody({ id }: { id: string }) {
  const now = useNow();
  const detail = useQuery(smartmeterQuery(id));
  const latest = useQuery(latestQuery(id));
  const power = useQuery(powerQuery(id));
  const today = spDateKey();
  const daily = useQuery(dailyQuery(id, addDays(today, -7), addDays(today, -1)));

  const rows = joinDevices(detail.data?.devices ?? [], latest.data);
  const counts = relayCounts(rows);
  const total = currentPower(latest.data);
  const newest = newestMeasured(latest.data);
  const stale = newest ? isStale(newest, now) : false;
  const lastDay = daily.data && daily.data.length ? daily.data[daily.data.length - 1] : null;
  const onCount = latest.data?.filter((m) => m.state === "ONLINE").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl bg-forest p-6 text-forest-foreground">
          <div className="flex items-center justify-between text-sm text-forest-foreground/80">Potência atual<Zap className="h-5 w-5 text-lime" /></div>
          {latest.isLoading ? <Skeleton className="mt-5 h-10 w-32 bg-forest-foreground/10" /> : latest.isError ? (
            <p className="mt-6 text-sm">{errorMessage(latest.error)}</p>
          ) : !newest ? (
            <><p className="mt-4 text-[38px] font-light leading-none">—</p><p className="mt-6 text-xs text-forest-foreground/80">Nenhuma leitura recebida ainda</p></>
          ) : stale ? (
            <><p className="mt-4 text-[38px] font-light leading-none">—</p><p className="mt-6 text-xs text-lime">Sem sinal da placa há {minutesAgo(newest, now)} min</p></>
          ) : (
            <><p className="mt-4 text-[38px] font-light leading-none tabular">{fmtInt(total)} <span className="text-base text-forest-foreground/70">W</span></p>
              <p className="mt-6 text-xs text-forest-foreground/80">Soma dos {onCount} dispositivos com relé ligado</p></>
          )}
        </div>
        <Card className="p-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">Último consumo diário<BarChart3 className="h-5 w-5" /></div>
          {daily.isLoading ? <Skeleton className="mt-5 h-10 w-32" /> : (
            <><p className="mt-4 text-[38px] font-light leading-none tabular">{lastDay ? fmt2(lastDay.kwh) : "—"} {lastDay && <span className="text-base text-muted-foreground">kWh</span>}</p>
              <p className="mt-6 text-xs text-muted-foreground">{lastDay ? `${fmtDayMonth(lastDay.date)} · consolidado na atualização noturna` : daily.isError ? errorMessage(daily.error) : "Ainda sem dias consolidados"}</p></>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">Dispositivos desta placa<Plug className="h-5 w-5" /></div>
          {detail.isLoading || latest.isLoading ? <Skeleton className="mt-5 h-10 w-16" /> : (
            <><p className="mt-4 text-[38px] font-light leading-none tabular">{rows.length}</p>
              <p className="mt-6 text-xs text-muted-foreground">{counts.on} {counts.on === 1 ? "relé ligado" : "relés ligados"} · {counts.off} {counts.off === 1 ? "relé desligado" : "relés desligados"}</p></>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Uma visão da sua energia</h2><p className="mt-1 text-xs text-muted-foreground">Potência em W · amostras de 1 minuto</p></div>
          <Pill tone="on">Até 48h</Pill>
        </div>
        <div className="mt-6 h-[200px]">
          {power.isLoading ? <Skeleton className="h-full w-full" /> : power.isError ? <ErrorState message={errorMessage(power.error)} onRetry={() => power.refetch()} />
            : !power.data?.length ? <p className="grid h-full place-items-center text-sm text-muted-foreground">Sem leituras nas últimas 48h.</p>
            : <PowerChart points={power.data} />}
        </div>
        <div className="mt-2 flex justify-between pl-12 text-[11px] text-muted-foreground"><span>Início da sequência</span><span>Leitura mais recente</span></div>
        <div className="mt-5"><Footnote>Leituras em sequência. Disponíveis somente nas últimas 48h.</Footnote></div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">Dispositivos em {detail.data?.name ?? "…"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">O estado abaixo indica o relé, não a conexão da placa.</p>
          </div>
          <Link to="/smartmeters/$id" params={{ id }} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand">
            Ver dispositivos <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        {detail.isLoading ? <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          : detail.isError ? <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
          : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum dispositivo nesta placa ainda.</p>
          : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {rows.slice(0, 4).map((r) => {
                const on = r.m?.state === "ONLINE";
                const known = r.m?.state === "ONLINE" || r.m?.state === "OFFLINE";
                return (
                  <div key={r.id} className="flex gap-3">
                    <DeviceIcon type={r.type} />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{r.deviceName}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{!r.m ? "Sem leitura" : known ? (on ? "Ligado" : "Desligado") : "Estado desconhecido"}</p>
                      <p className="mt-3 text-xl tabular">{on ? `${fmtInt(r.m!.powerW)} W` : <span className="text-muted-foreground">— W</span>}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </Card>
    </div>
  );
}

function PowerChart({ points }: { points: { at: string; powerW: number }[] }) {
  const data = useMemo(() => withGaps(points), [points]);
  const domain: [number, number] = [data[0].t, data[data.length - 1].t];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--leaf)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="t" type="number" scale="time" domain={domain} tickFormatter={(t) => fmtTime(t)} tickCount={7}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis width={44} tickFormatter={(v) => fmtInt(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip
          labelFormatter={(t) => fmtTime(Number(t))}
          formatter={(v) => [v == null ? "—" : `${fmtInt(Number(v))} W`, "Potência"]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
        />
        <Area type="linear" dataKey="powerW" stroke="var(--brand)" strokeWidth={1.75} fill="url(#pw)" connectNulls={false} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
