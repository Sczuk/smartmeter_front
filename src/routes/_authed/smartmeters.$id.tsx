import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Cpu, Loader2, Plug, Plus, Power, ShieldCheck, ToggleLeft, Trash2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, DeviceIcon, ErrorState, Footnote, PageHeader, Pill, Pins, StateBadge, typeLabel, EmptyState } from "@/components/sm/bits";
import { ConfirmDelete } from "@/components/sm/ConfirmDelete";
import { CopyButton } from "@/components/sm/CopyButton";
import { createDevice, deleteDevice, sendCommand } from "@/lib/api.functions";
import { latestQuery, smartmeterQuery } from "@/lib/queries";
import { currentPower, joinDevices, relayCounts, type DeviceRow } from "@/lib/devices";
import { fmt2, fmtInt, isStale, minutesAgo, shortId } from "@/lib/format";
import { errorMessage, statusOf } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/lib/types";

export const Route = createFileRoute("/_authed/smartmeters/$id")({
  head: () => ({
    meta: [
      { title: "Dispositivos do smartmeter — SmartMeter" },
      { name: "description", content: "Veja cada dispositivo e controle os relés individualmente." },
      { property: "og:title", content: "Dispositivos do smartmeter — SmartMeter" },
      { property: "og:description", content: "Veja cada dispositivo e controle os relés individualmente." },
    ],
  }),
  component: DetailPage,
});

type Pending = { deviceId: string; name: string; target: boolean; startedAt: number };
const TIMEOUT_MS = 90_000;

function DetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<DeviceRow | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const detail = useQuery(smartmeterQuery(id));
  const latest = useQuery(latestQuery(id, !!pending));
  const command = useServerFn(sendCommand);
  const del = useServerFn(deleteDevice);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

  // Resolve pending command against polled readings.
  useEffect(() => {
    if (!pending) return;
    const m = latest.data?.find((x) => x.deviceId === pending.deviceId);
    if (m && m.state === (pending.target ? "ONLINE" : "OFFLINE")) {
      toast.success(`${pending.name} ${pending.target ? "ligado" : "desligado"}`);
      setPending(null);
    }
  }, [latest.data, pending]);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => { setPending(null); setFailure(`Não foi possível confirmar o comando para ${pending.name}.`); },
      Math.max(0, pending.startedAt + TIMEOUT_MS - Date.now()));
    return () => clearTimeout(t);
  }, [pending]);

  async function toggle(r: DeviceRow, on: boolean) {
    if (pending) return;
    setFailure(null);
    try {
      await command({ data: { deviceId: r.id, on } });
      setPending({ deviceId: r.id, name: r.deviceName, target: on, startedAt: Date.now() });
    } catch (e) {
      setFailure(statusOf(e) === 503 ? "Não foi possível enviar o comando." : errorMessage(e));
    }
  }

  if (detail.isError)
    return <Card><ErrorState message={statusOf(detail.error) === 404 ? "Smartmeter não encontrado." : errorMessage(detail.error)} onRetry={() => detail.refetch()} /></Card>;

  const sm = detail.data;
  const rows = joinDevices(sm?.devices ?? [], latest.data);
  const counts = relayCounts(rows);
  const total = currentPower(latest.data);

  return (
    <div className="space-y-6">
      <PageHeader crumb={<><Link to="/smartmeters" className="hover:underline">Smartmeters</Link> / {sm?.name ?? "…"}</>}
        title={sm?.name ?? "Carregando…"} subtitle="Veja cada dispositivo e controle os relés individualmente."
        action={<Button variant="lime" className="h-10 px-4" disabled={!sm} onClick={() => setAdding(true)}><Plus />Adicionar dispositivo</Button>} />

      <Card className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1.4fr_1.1fr_1.6fr] lg:items-center">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground"><Cpu className="h-6 w-6" /></span>
        <Info label="ID da placa">{sm ? <span className="flex items-center gap-2"><span className="font-mono font-semibold">{shortId(sm.id)}</span><CopyButton value={sm.id} /></span> : <Skeleton className="h-5 w-24" />}</Info>
        <Info label="Endereço MAC">{sm ? <span className="font-mono">{sm.macAddress}</span> : <Skeleton className="h-5 w-32" />}</Info>
        <Info label="Dispositivos">{sm ? <span className="font-semibold">{rows.length} {rows.length === 1 ? "dispositivo" : "dispositivos"}</span> : <Skeleton className="h-5 w-24" />}</Info>
        <Info label="Potência atual">
          {latest.isLoading ? <Skeleton className="h-7 w-24" /> : latest.isError ? <span className="text-sm text-muted-foreground">—</span> :
            <span className="flex items-baseline gap-1 text-2xl font-semibold tabular">{latest.data?.length ? fmtInt(total) : "—"} <span className="text-xs font-normal text-muted-foreground">W</span><Zap className="h-4 w-4 self-center text-brand" /></span>}
        </Info>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-semibold">Dispositivos</h2><p className="mt-1 text-xs text-muted-foreground">Cada dispositivo usa 3 pinos da placa.</p></div>
          <div className="flex gap-2"><Pill tone="on">{counts.on} {counts.on === 1 ? "ligado" : "ligados"}</Pill><Pill>{counts.off} {counts.off === 1 ? "desligado" : "desligados"}</Pill></div>
        </div>
        <div className="hidden grid-cols-[2fr_1.1fr_1.2fr_0.9fr_0.8fr_1fr_1.8fr] bg-muted px-6 py-4 text-[11px] font-semibold uppercase text-muted-foreground lg:grid">
          <span>Dispositivo</span><span>Pinos</span><span>Estado do relé</span><span>Corrente (A)</span><span>Tensão (V)</span><span>Potência (W)</span><span className="text-right">Controle individual</span>
        </div>
        {detail.isLoading ? <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          : rows.length === 0 ? <EmptyState icon={<Plug className="h-5 w-5" />} title="Nenhum dispositivo ainda" text="Adicione uma tomada ou interruptor a esta placa."
              action={<Button variant="lime" onClick={() => setAdding(true)}><Plus />Adicionar dispositivo</Button>} />
          : rows.map((r) => {
            const isPending = pending?.deviceId === r.id;
            const on = r.m?.state === "ONLINE";
            const known = r.m?.state === "ONLINE" || r.m?.state === "OFFLINE";
            const val = (v: string) => (on ? v : "—");
            return (
              <div key={r.id} className={cn("grid grid-cols-2 gap-3 border-t border-border px-6 py-6 lg:grid-cols-[2fr_1.1fr_1.2fr_0.9fr_0.8fr_1fr_1.8fr] lg:items-center", isPending && "bg-warn-soft")}>
                <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                  <DeviceIcon type={r.type} />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.deviceName}</p>
                    <p className="text-[11px] text-muted-foreground">{typeLabel(r.type)}
                      {r.m && isStale(r.m.measured, now) && <> · última leitura há {minutesAgo(r.m.measured, now)} min</>}</p>
                  </div>
                </div>
                <Cell label="Pinos"><Pins channels={r.channels} /></Cell>
                <Cell label="Estado do relé">{r.m ? <StateBadge state={r.m.state} /> : <Pill>Sem leitura</Pill>}</Cell>
                <Cell label="Corrente (A)"><span className="font-mono text-sm">{val(r.m ? fmt2(r.m.currentA) : "—")}</span></Cell>
                <Cell label="Tensão (V)"><span className="font-mono text-sm">{val(r.m ? fmtInt(r.m.voltageV) : "—")}</span></Cell>
                <Cell label="Potência (W)"><span className="font-mono text-sm">{val(r.m ? fmtInt(r.m.powerW) : "—")}</span></Cell>
                <div className="col-span-2 flex items-center justify-end gap-2 lg:col-span-1">
                  {isPending ? (
                    <Button variant="pending" className="h-9" disabled><Loader2 className="animate-spin" />{pending!.target ? "Ligando..." : "Desligando..."}</Button>
                  ) : on ? (
                    <Button variant="quiet" className="h-9" disabled={!!pending} onClick={() => toggle(r, false)}><Power />Desligar</Button>
                  ) : (
                    <Button variant="lime" className="h-9" disabled={!!pending || (r.m != null && !known)} onClick={() => toggle(r, true)}><Power />Ligar</Button>
                  )}
                  <Button variant="trash" size="icon" aria-label={`Excluir ${r.deviceName}`} disabled={isPending} onClick={() => setToDelete(r)}><Trash2 /></Button>
                </div>
              </div>
            );
          })}
        <div className="border-t border-border px-6 py-4"><Footnote>— Leitura indisponível enquanto o relé está desligado.</Footnote></div>
      </Card>

      {pending && (
        <div className="flex items-start gap-4 rounded-xl border border-warn-border bg-warn-soft p-5 text-warn">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-semibold">{pending.target ? "Ligando" : "Desligando"} {pending.name}</p>
            <p className="mt-1 text-xs">Aguardando confirmação. O relé mantém o último estado confirmado {pending.target ? "e as leituras continuam indisponíveis." : "até a confirmação do comando."}</p>
          </div>
        </div>
      )}
      {failure && (
        <div role="alert" className="flex items-start gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">{failure}</p>
          <button aria-label="Fechar" onClick={() => setFailure(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Você controla um dispositivo de cada vez. Confira o nome antes de ligar ou desligar.</p>

      <AddDeviceDialog smartmeterId={id} open={adding} onOpenChange={setAdding} />
      <ConfirmDelete name={toDelete?.deviceName ?? ""} open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={async () => {
          try {
            await del({ data: { smartmeterId: id, deviceId: toDelete!.id } });
            toast.success("Dispositivo excluído");
            await Promise.all([qc.invalidateQueries({ queryKey: ["smartmeter", id] }), qc.invalidateQueries({ queryKey: ["smartmeters"] })]);
          } catch (e) { toast.error(errorMessage(e)); throw e; }
        }} />
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><p className="mb-1.5 text-xs text-muted-foreground">{label}</p><div className="text-sm">{children}</div></div>;
}
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground lg:hidden">{label}</p>{children}</div>;
}

function AddDeviceDialog({ smartmeterId, open, onOpenChange }: { smartmeterId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<DeviceType>("OUTLET");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createDevice);
  const qc = useQueryClient();
  const reset = () => { setName(""); setType("OUTLET"); setError(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Informe um nome."); return; }
    setBusy(true); setError(null);
    try {
      await create({ data: { smartmeterId, name, type } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["smartmeter", smartmeterId] }), qc.invalidateQueries({ queryKey: ["smartmeters"] })]);
      toast.success("Dispositivo adicionado");
      reset(); onOpenChange(false);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  const opt = (t: DeviceType, label: string, Icon: typeof Plug) => (
    <button type="button" onClick={() => setType(t)} aria-pressed={type === t}
      className={cn("flex h-[52px] items-center gap-3 rounded-lg border px-5 text-sm", type === t ? "border-brand bg-leaf-soft font-semibold text-brand" : "border-input")}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-[480px] rounded-xl p-7">
        <DialogTitle className="text-2xl font-semibold">Adicionar dispositivo</DialogTitle>
        <DialogDescription className="sr-only">Informe o nome e o tipo do dispositivo.</DialogDescription>
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do dispositivo"
              className="h-12 w-full rounded-lg border border-input px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <div>
            <span className="mb-2 block text-sm font-medium">Tipo</span>
            <div className="grid grid-cols-2 gap-3">{opt("OUTLET", "Tomada", Plug)}{opt("SWITCH", "Interruptor", ToggleLeft)}</div>
            <p className="mt-3 text-xs text-muted-foreground">Os pinos são atribuídos automaticamente.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="quiet" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" variant="lime" className="h-10 px-4" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
