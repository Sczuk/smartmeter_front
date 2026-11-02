import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setDone(true); toast.success("ID copiado"); setTimeout(() => setDone(false), 1500); }
      catch { toast.error("Não foi possível copiar"); }
    }} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium hover:bg-muted">
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}Copiar
    </button>
  );
}
