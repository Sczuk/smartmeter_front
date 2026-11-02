import { Plug, ToggleLeft, Zap, Info, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-lime text-lime-foreground">
        <Zap className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className={cn("text-[22px] tracking-tight", dark ? "text-forest-foreground" : "text-foreground")}>SmartMeter</span>
    </div>
  );
}

export function DeviceIcon({ type, className }: { type: DeviceType | string; className?: string }) {
  const Icon = type === "SWITCH" ? ToggleLeft : Plug;
  return (
    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground", className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
export const typeLabel = (t: string) => (t === "SWITCH" ? "Interruptor" : "Tomada");

export function Pins({ channels }: { channels?: number[] }) {
  if (!channels || channels.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {channels.map((c, i) => (
        <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{c}</span>
      ))}
    </div>
  );
}

export function StateBadge({ state }: { state?: string }) {
  if (state === "ONLINE")
    return <Pill tone="on">Ligado</Pill>;
  if (state === "OFFLINE") return <Pill tone="off">Desligado</Pill>;
  return <Pill tone="off">Estado desconhecido</Pill>;
}

export function Pill({ tone = "off", children, className }: { tone?: "on" | "off"; children: ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
      tone === "on" ? "bg-leaf-soft text-brand" : "bg-muted text-muted-foreground",
      className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "on" ? "bg-brand" : "bg-muted-foreground")} />
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action, crumb }: { title: string; subtitle: string; action?: ReactNode; crumb?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumb && <div className="mb-1 text-sm text-muted-foreground">{crumb}</div>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Footnote({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" />{children}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button variant="quiet" size="sm" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-leaf-soft text-brand">{icon}</span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
