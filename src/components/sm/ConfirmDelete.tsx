import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDelete({ name, open, onOpenChange, onConfirm }: {
  name: string; open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-[480px] rounded-xl p-7">
        <DialogTitle className="text-2xl font-semibold">Excluir {name}?</DialogTitle>
        <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="quiet" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant="danger" className="h-10 px-4" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); }
          }}>{busy && <Loader2 className="animate-spin" />}Excluir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
