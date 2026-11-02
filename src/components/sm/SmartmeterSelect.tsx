import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SmartmeterSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SmartmeterSelect({ items, value, onChange, className }: {
  items: SmartmeterSummary[]; value: string; onChange: (id: string) => void; className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-11 bg-card text-sm", className)} aria-label="Smartmeter">
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {items.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
