import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthLayout, Field } from "@/components/sm/AuthLayout";
import { hasSession, login } from "@/lib/api.functions";
import { messageForStatus } from "@/lib/errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — SmartMeter" },
      { name: "description", content: "Entre para acompanhar a energia da sua casa." },
      { property: "og:title", content: "Entrar — SmartMeter" },
      { property: "og:description", content: "Entre para acompanhar a energia da sua casa." },
    ],
  }),
  beforeLoad: async () => {
    if ((await hasSession()).authed) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const doLogin = useServerFn(login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await doLogin({ data: { email, password, remember } });
      if (r.ok) navigate({ to: "/", replace: true });
      else setError(r.status === 401 ? "E-mail ou senha incorretos" : messageForStatus(r.status));
    } catch {
      setError(messageForStatus(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[34px] font-semibold tracking-tight">Bom ter você de volta.</h2>
      <p className="mt-2 text-sm text-muted-foreground">Entre para acompanhar a energia da sua casa.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="E-mail" icon={<Mail className="h-4 w-4" />}>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className="h-full flex-1 bg-transparent text-sm outline-none" />
        </Field>
        <Field label="Senha" icon={<Lock className="h-4 w-4" />}>
          <input type={show ? "text" : "password"} required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" className="h-full flex-1 bg-transparent text-sm outline-none" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="text-muted-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          Lembrar de mim
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="lime" disabled={busy} className="h-[52px] w-full justify-between px-5 text-[15px]">
          Entrar na minha conta {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        Ainda não tem uma conta? <Link to="/cadastro" className="font-semibold text-brand">Criar conta</Link>
      </p>
    </AuthLayout>
  );
}
