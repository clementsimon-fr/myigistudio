import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export function TemplateEditor({ value, onChange, variables, readOnly, showInsertModalities, rows = 3 }: {
  value: string; onChange: (v: string) => void;
  variables: { key: string; label: string }[];
  readOnly?: boolean;
  showInsertModalities?: boolean;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    if (readOnly) return;
    const ta = textareaRef.current;
    if (!ta) { onChange(value + variable); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = value.substring(0, start) + variable + value.substring(end);
    onChange(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  return (
    <div className="space-y-1.5">
      <Textarea ref={textareaRef} value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows} readOnly={readOnly} className={`text-xs ${readOnly ? "opacity-60" : ""}`} />
      {!readOnly && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Insérer :</span>
          {variables.map(v => (
            <Button key={v.key} type="button" size="sm" variant="outline" className="h-5 text-[10px] px-1.5 font-mono"
              onClick={() => insertVariable(v.key)}>{v.key}</Button>
          ))}
          {showInsertModalities && (
            <Button type="button" size="sm" variant="outline" className="h-5 text-[10px] px-1.5 gap-1 border-dashed"
              onClick={() => insertVariable("{modalités}")}>
              <MapPin className="h-3 w-3" /> Insérer modalités
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
