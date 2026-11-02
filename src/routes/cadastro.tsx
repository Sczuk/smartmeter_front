import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthLayout, Field } from "@/components/sm/AuthLayout";
import { hasSession, register } from "@/lib/api.functions";
import { messageForStatus } from "@/lib/errors";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — SmartMeter" },
      { name: "description", content: "Crie seu espaço de energia e comece a acompanhar sua casa." },
      { property: "og:title", content: "Criar conta — SmartMeter" },
      { property: "og:description", content: "Crie seu espaço de energia e comece a acompanhar sua casa." },
    ],
  }),
  beforeLoad: async () => {
    if ((await hasSession()).authed) throw redirect({ to: "/" });
  },
  component: SignupPage,
});

function SignupPage() {
  const doRegister = useServerFn(register);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await doRegister({ data: { name, email, password } });
      if (r.ok) navigate({ to: "/", replace: true });
      else setError(r.status === 409 ? "Já existe uma conta com este e-mail." : messageForStatus(r.status));
    } catch {
      setError(messageForStatus(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[34px] font-semibold tracking-tight">Crie seu espaço de energia.</h2>
      <p className="mt-2 text-sm text-muted-foreground">Comece a acompanhar a energia da sua casa.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Nome" icon={<User className="h-4 w-4" />}>
          <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
            className="h-full flex-1 bg-transparent text-sm outline-none" />
        </Field>
        <Field label="E-mail" icon={<Mail className="h-4 w-4" />}>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className="h-full flex-1 bg-transparent text-sm outline-none" />
        </Field>
        <Field label="Senha" icon={<Lock className="h-4 w-4" />}>
          <input type={show ? "text" : "password"} required minLength={6} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha" className="h-full flex-1 bg-transparent text-sm outline-none" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="text-muted-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="lime" disabled={busy} className="h-[52px] w-full justify-between px-5 text-[15px]">
          Criar minha conta {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        Já tem uma conta? <Link to="/login" className="font-semibold text-brand">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
