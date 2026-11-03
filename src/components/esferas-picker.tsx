import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ESFERAS } from "@/lib/esferas";

export function EsferasPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Esfera</Label>
      <div className="flex flex-wrap gap-4 rounded-lg border border-border/60 p-3">
        {ESFERAS.map((e) => (
          <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={value.includes(e.id)}
              onCheckedChange={(v) => onChange(v ? [...value, e.id] : value.filter((x) => x !== e.id))}
            />
            {e.nome}
          </label>
        ))}
      </div>
    </div>
  );
}
