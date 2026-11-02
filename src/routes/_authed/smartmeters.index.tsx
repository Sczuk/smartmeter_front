import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cpu, Fingerprint, Loader2, Plug, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, EmptyState, ErrorState, PageHeader, Pill } from "@/components/sm/bits";
import { ConfirmDelete } from "@/components/sm/ConfirmDelete";
import { CopyButton } from "@/components/sm/CopyButton";
import { createSmartmeter, deleteSmartmeter } from "@/lib/api.functions";
import { smartmetersQuery } from "@/lib/queries";
import { isValidMac, normalizeMac, pad2, shortId } from "@/lib/format";
import { errorMessage, statusOf } from "@/lib/errors";
import type { SmartmeterSummary } from "@/lib/types";

export const Route = createFileRoute("/_authed/smartmeters/")({
  head: () => ({
    meta: [
      { title: "Seus smartmeters — SmartMeter" },
      { name: "description", content: "Organize suas placas e encontre cada ponto de consumo." },
      { property: "og:title", content: "Seus smartmeters — SmartMeter" },
      { property: "og:description", content: "Organize suas placas e encontre cada ponto de consumo." },
    ],
  }),
  component: SmartmetersPage,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function SmartmetersPage() {
  const q = useQuery(smartmetersQuery());
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<SmartmeterSummary | null>(null);
  const qc = useQueryClient();
  const del = useServerFn(deleteSmartmeter);

  const all = q.data?.smartmeters ?? [];
  const totalDevices = all.reduce((s, m) => s + m.amountConnectedDevices, 0);
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return all;
    return all.filter((m) => m.name.toLowerCase().includes(t) || m.id.toLowerCase().includes(t) || m.macAddress.toLowerCase().includes(t));
  }, [all, search]);

  const addBtn = <Button variant="lime" className="h-10 px-4" onClick={() => setAdding(true)}><Plus />Adicionar smartmeter</Button>;

  return (
    <div className="space-y-6">
      <PageHeader title="Seus smartmeters" subtitle="Organize suas placas e encontre cada ponto de consumo." action={addBtn} />

      <div className="grid gap-5 md:grid-cols-2">
        {[
          { icon: <Cpu className="h-5 w-5" />, label: "Smartmeters cadastrados", value: all.length, note: "Uma visão de toda a sua casa" },
          { icon: <Plug className="h-5 w-5" />, label: "Dispositivos associados", value: totalDevices, note: `Distribuídos entre suas ${plural(all.length, "placa", "placas").replace(/^1 placas/, "1 placa")}` },
        ].map((c) => (
          <Card key={c.label} className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">{c.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              {q.isLoading ? <Skeleton className="my-1 h-8 w-12" /> : <p className="text-[28px] font-light leading-tight tabular">{pad2(c.value)}</p>}
              <p className="text-[11px] text-muted-foreground">{c.note}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Todas as placas</h2>
            <Pill>{plural(all.length, "smartmeter", "smartmeters")}</Pill>
          </div>
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-input px-3 sm:w-[330px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, ID ou MAC" className="flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>

        {q.isLoading ? <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          : all.length === 0 ? <EmptyState icon={<Cpu className="h-5 w-5" />} title="Nenhum smartmeter cadastrado"
              text="Adicione sua primeira placa para acompanhar o consumo dos seus dispositivos." action={addBtn} />
          : filtered.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma placa encontrada para “{search}”.</p>
          : (
            <>
              <div className="hidden grid-cols-[2fr_1.6fr_1.4fr_auto] bg-muted px-6 py-4 text-[11px] font-semibold uppercase text-muted-foreground md:grid">
                <span>Smartmeter / ID da placa</span><span>Endereço MAC</span><span>Dispositivos</span><span className="text-right">Ações</span>
              </div>
              {filtered.map((m) => (
                <div key={m.id} className="grid gap-3 border-t border-border px-6 py-6 md:grid-cols-[2fr_1.6fr_1.4fr_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-leaf-soft text-brand"><Cpu className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{m.name}</p>
                      <div className="mt-1 flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{shortId(m.id)}</span><CopyButton value={m.id} /></div>
                    </div>
                  </div>
                  <span className="font-mono text-sm">{m.macAddress}</span>
                  <span className="flex items-center gap-2 text-sm"><Plug className="h-4 w-4 text-muted-foreground" />{plural(m.amountConnectedDevices, "dispositivo", "dispositivos")}</span>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button asChild variant="quiet" className="h-9"><Link to="/smartmeters/$id" params={{ id: m.id }}>Ver dispositivos</Link></Button>
                    <Button variant="trash" size="icon" aria-label={`Excluir ${m.name}`} onClick={() => setToDelete(m)}><Trash2 /></Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
                <span>Exibindo {filtered.length} de {plural(all.length, "smartmeter", "smartmeters")}</span>
                <span>{plural(totalDevices, "dispositivo", "dispositivos")} no total</span>
              </div>
            </>
          )}
      </Card>

      <div className="flex gap-4 rounded-xl bg-leaf-soft p-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-card text-brand"><Fingerprint className="h-6 w-6" /></span>
        <div>
          <p className="font-semibold">Cada placa tem sua própria identidade.</p>
          <p className="mt-1 text-sm text-brand">Use o ID e o endereço MAC para reconhecer seu smartmeter. Cada dispositivo usa 3 pinos da placa, onde ficam os sensores dele.</p>
        </div>
      </div>

      <AddSmartmeterDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDelete name={toDelete?.name ?? ""} open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={async () => {
          try {
            await del({ data: { id: toDelete!.id } });
            toast.success("Smartmeter excluído");
            await qc.invalidateQueries({ queryKey: ["smartmeters"] });
          } catch (e) { toast.error(errorMessage(e)); throw e; }
        }} />
    </div>
  );
}

function AddSmartmeterDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [mac, setMac] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createSmartmeter);
  const qc = useQueryClient();
  const macOk = isValidMac(mac);

  function reset() { setName(""); setMac(""); setTouched(false); setError(null); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !macOk) return;
    setBusy(true); setError(null);
    try {
      await create({ data: { name, macAddress: normalizeMac(mac) } });
      await qc.invalidateQueries({ queryKey: ["smartmeters"] });
      toast.success("Smartmeter adicionado");
      reset(); onOpenChange(false);
    } catch (err) {
      setError(statusOf(err) === 409 ? "Já existe um smartmeter com este endereço MAC." : errorMessage(err));
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-[480px] rounded-xl p-7">
        <DialogTitle className="text-2xl font-semibold">Adicionar smartmeter</DialogTitle>
        <DialogDescription className="sr-only">Informe o nome e o endereço MAC da placa.</DialogDescription>
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do smartmeter"
              className="h-12 w-full rounded-lg border border-input px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
            {touched && !name.trim() && <span className="mt-1 block text-xs text-destructive">Informe um nome.</span>}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Endereço MAC</span>
            <input value={mac} onChange={(e) => setMac(e.target.value.toUpperCase())} placeholder="24:6F:28:A1:3C:90" maxLength={17}
              className="h-12 w-full rounded-lg border border-input px-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
            <span className={`mt-1 block text-xs ${touched && !macOk ? "text-destructive" : "text-muted-foreground"}`}>
              {touched && !macOk ? "Use o formato XX:XX:XX:XX:XX:XX." : "Formato: 24:6F:28:A1:3C:90"}
            </span>
          </label>
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
