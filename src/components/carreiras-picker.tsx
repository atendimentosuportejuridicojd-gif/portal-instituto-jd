import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CARREIRAS } from "@/lib/carreiras";

export function CarreirasPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Aparece nas carreiras</Label>
      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        {CARREIRAS.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={value.includes(c.id)}
              onCheckedChange={(v) => onChange(v ? [...value, c.id] : value.filter((x) => x !== c.id))}
            />
            {c.nome}
          </label>
        ))}
      </div>
      {value.length === 0 && <p className="text-xs text-destructive">Escolha pelo menos uma carreira.</p>}
    </div>
  );
}
