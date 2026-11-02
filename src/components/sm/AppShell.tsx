import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Cpu, LayoutGrid, LogOut, Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerFn } from "@tanstack/react-start";
import { logout } from "@/lib/api.functions";
import { smartmetersQuery } from "@/lib/queries";
import { fmtDateLong, initials, spDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "./bits";

const NAV = [
  { to: "/", label: "Visão geral", icon: LayoutGrid },
  { to: "/smartmeters", label: "Smartmeters", icon: Cpu },
  { to: "/historico", label: "Histórico de consumo", icon: BarChart3 },
] as const;

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = useQuery(smartmetersQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const doLogout = useServerFn(logout);
  const name = data?.name ?? "";

  async function handleLogout() {
    await qc.cancelQueries();
    await doLogout();
    qc.clear();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex h-full flex-col px-5 py-7">
      <Logo />
      <p className="mt-12 mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Espaço de energia</p>
      <nav className="flex flex-col gap-1.5">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link key={to} to={to} onClick={onNavigate}
              className={cn("flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-3 text-sm transition-colors",
                active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted")}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-3 border-t border-border pt-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
          {isLoading ? "" : initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          {isLoading ? <Skeleton className="h-4 w-24" /> : <p className="truncate text-sm font-medium">{name || "—"}</p>}
          <p className="text-xs text-muted-foreground">Conta pessoal</p>
        </div>
        <button onClick={handleLogout} aria-label="Sair" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  useEffect(() => setToday(fmtDateLong(spDateKey())), []);
  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] items-center justify-between border-b border-border bg-shell px-5 sm:px-8">
          <button className="rounded-md p-2 hover:bg-muted lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-auto text-sm text-muted-foreground">{today}</span>
        </header>
        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
        <footer className="px-5 pb-6 text-[11px] text-muted-foreground sm:px-8">SmartMeter · Sua energia, com clareza.</footer>
      </div>
    </div>
  );
}
