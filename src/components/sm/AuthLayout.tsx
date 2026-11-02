import { ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import house from "@/assets/house-night.jpg";
import { Logo } from "./bits";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[49%_51%]">
      <section className="relative hidden flex-col overflow-hidden bg-forest px-12 py-12 text-forest-foreground lg:flex">
        <img src={house} alt="Casa moderna iluminada à noite" width={1024} height={1024}
          className="absolute inset-x-0 bottom-0 h-[58%] w-full object-cover" />
        <div className="absolute inset-x-0 bottom-[50%] h-[22%] bg-gradient-to-b from-forest to-transparent" />
        <div className="relative">
          <Logo dark />
          <p className="mt-20 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-lime">
            <span className="h-px w-6 bg-lime" />Sua casa. Sua energia.
          </p>
          <h1 className="mt-6 max-w-lg text-[52px] font-medium leading-[1.05] tracking-tight">Conheça a energia que move sua casa.</h1>
          <p className="mt-6 max-w-md text-base text-forest-foreground/75">
            Acompanhe o consumo. Controle seus dispositivos. Faça escolhas com mais clareza.
          </p>
        </div>
        <div className="relative mt-auto">
          <div className="rounded-xl border border-forest-foreground/15 bg-forest/85 p-6 backdrop-blur">
            <p className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-lime" />Energia em perspectiva</p>
            <div className="mt-4 flex items-end justify-between gap-6">
              <div>
                <p className="text-sm text-forest-foreground/70">Cada leitura conta uma história.</p>
              </div>
              <svg viewBox="0 0 250 60" className="h-14 w-60 text-lime" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="0,50 18,45 33,55 52,30 68,40 85,15 100,22 118,20 135,42 152,28 168,24 185,0 202,14 218,8 236,20 250,12" />
              </svg>
            </div>
          </div>
          <div className="mt-8 flex justify-between text-[11px] text-forest-foreground/70">
            <span>Feito para uma casa mais consciente.</span><span>SmartMeter © {new Date().getFullYear()}</span>
          </div>
        </div>
      </section>
      <section className="flex flex-col bg-card px-6 py-10 sm:px-16 lg:px-28">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Seu espaço de energia</span>
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-10 lg:hidden"><Logo /></div>
        <div className="mt-auto w-full max-w-[512px] pt-12 pb-4">{children}</div>
      </section>
    </div>
  );
}

export function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="flex h-[52px] items-center gap-3 rounded-lg border border-input px-4 focus-within:ring-2 focus-within:ring-ring">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </span>
    </label>
  );
}
