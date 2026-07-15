import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseCsv } from "@/lib/csv";

type ImportType = "clients" | "reservations" | "cartes";

const TARGET_FIELDS: Record<ImportType, { key: string; label: string; required?: boolean }[]> = {
  clients: [
    { key: "first_name", label: "Prénom", required: true },
    { key: "last_name", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Téléphone" },
    { key: "address", label: "Adresse" },
  ],
  reservations: [
    { key: "client_name", label: "Nom du client", required: true },
    { key: "activity_name", label: "Activité", required: true },
    { key: "date", label: "Date (AAAA-MM-JJ)", required: true },
    { key: "time", label: "Heure (HH:MM)", required: true },
    { key: "status", label: "Statut (confirmé/annulé)" },
  ],
  cartes: [
    { key: "client_name", label: "Nom du client", required: true },
    { key: "card_name", label: "Nom de la carte", required: true },
    { key: "total_sessions", label: "Séances totales", required: true },
    { key: "used_sessions", label: "Séances utilisées" },
    { key: "expires_at", label: "Expiration (AAAA-MM-JJ)", required: true },
  ],
};

const TYPE_LABELS: Record<ImportType, string> = {
  clients: "Clients",
  reservations: "Historique de réservations",
  cartes: "Cartes Yoga",
};

type WizardStep = "type" | "upload" | "mapping" | "preview" | "done";

export default function ImportWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("type");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<{ created: number; skipped: number; errors: number } | null>(null);
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());

  const fields = importType ? TARGET_FIELDS[importType] : [];

  const handleFile = async (file: File) => {
    const text = await file.text();
    const { headers: h, rows: r } = parseCsv(text);
    setFileName(file.name);
    setHeaders(h);
    setRows(r);
    const auto: Record<string, string> = {};
    h.forEach((header) => {
      const norm = header.toLowerCase().trim();
      const match = fields.find((f) => f.label.toLowerCase().includes(norm) || norm.includes(f.key) || norm.includes(f.label.toLowerCase()));
      auto[header] = match ? match.key : "__ignore__";
    });
    setMapping(auto);
    setStep("mapping");
  };

  const mappedRows = () => {
    return rows.map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        const target = mapping[h];
        if (target && target !== "__ignore__") obj[target] = (r[i] || "").trim();
      });
      return obj;
    });
  };

  const goToPreview = async () => {
    if (importType === "clients") {
      const [profilesRes, clientProfilesRes] = await Promise.all([
        supabase.from("profiles").select("email, phone"),
        supabase.from("client_profiles").select("email, phone"),
      ]);
      const keys = new Set<string>();
      [...(profilesRes.data || []), ...(clientProfilesRes.data || [])].forEach((p: any) => {
        if (p.email) keys.add(p.email.toLowerCase());
        if (p.phone) keys.add(p.phone);
      });
      setExistingKeys(keys);
    }
    setStep("preview");
  };

  const isRowValid = (row: Record<string, string>) => fields.every((f) => !f.required || (row[f.key] && row[f.key].length > 0));
  const isDuplicate = (row: Record<string, string>) =>
    importType === "clients" && ((row.email && existingKeys.has(row.email.toLowerCase())) || (row.phone && existingKeys.has(row.phone)));

  const rowsMapped = mappedRows();
  const validCount = rowsMapped.filter(isRowValid).length;
  const duplicateCount = rowsMapped.filter((r) => isRowValid(r) && isDuplicate(r)).length;

  const runImport = async () => {
    setImporting(true);
    let created = 0, skipped = 0, errors = 0;
    const toInsert = rowsMapped.filter((r) => isRowValid(r) && !isDuplicate(r));
    skipped = rowsMapped.length - toInsert.length;

    const chunkSize = 200;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize).map((row) => {
        if (importType === "clients") {
          return {
            first_name: row.first_name || "",
            last_name: row.last_name || "",
            email: row.email || "",
            phone: row.phone || "",
            address: row.address || "",
            user_name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "Client importé",
          };
        }
        if (importType === "reservations") {
          return {
            client_name: row.client_name,
            activity_name: row.activity_name,
            activity_type: "course",
            date: row.date,
            time: row.time,
            participants: 1,
            status: row.status || "confirmé",
          };
        }
        return {
          client_name: row.client_name,
          card_name: row.card_name,
          total_sessions: parseInt(row.total_sessions, 10) || 0,
          used_sessions: parseInt(row.used_sessions, 10) || 0,
          expires_at: row.expires_at,
        };
      });
      const table = importType === "clients" ? "profiles" : importType === "reservations" ? "reservations" : "client_cards";
      const { error } = await supabase.from(table).insert(chunk as any);
      if (error) errors += chunk.length;
      else created += chunk.length;
    }

    setImporting(false);
    setReport({ created, skipped, errors });
    setStep("done");
    toast({ title: "Import terminé", description: `${created} ligne(s) importée(s)` });
  };

  const reset = () => {
    setStep("type");
    setImportType(null);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setReport(null);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Step: choose type */}
      {step === "type" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Que voulez-vous importer ?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(TYPE_LABELS) as ImportType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setImportType(t); setStep("upload"); }}
                className="rounded-xl border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/40 transition-colors"
              >
                <p className="font-medium text-sm">{TYPE_LABELS[t]}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: upload */}
      {step === "upload" && importType && (
        <div className="space-y-4">
          <Badge variant="outline">{TYPE_LABELS[importType]}</Badge>
          <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center space-y-3">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Sélectionnez un fichier CSV exporté (Calendly, SimplyBook, ou autre).</p>
            <Input
              type="file"
              accept=".csv"
              className="max-w-xs mx-auto"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep("type")}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </div>
      )}

      {/* Step: mapping */}
      {step === "mapping" && importType && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {fileName} — {rows.length} ligne(s) détectée(s). Associez chaque colonne du fichier à un champ.
          </p>
          <div className="rounded-xl border bg-card divide-y">
            {headers.map((h) => (
              <div key={h} className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium truncate">{h}</span>
                <Select value={mapping[h] || "__ignore__"} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ignore__">Ignorer cette colonne</SelectItem>
                    {fields.map((f) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-1.5" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button className="gap-1.5" onClick={goToPreview}>
              Aperçu <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: preview */}
      {step === "preview" && importType && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{rowsMapped.length} ligne(s) au total</Badge>
            <Badge className="bg-primary/15 text-primary-dark border-primary/30">{validCount} valide(s)</Badge>
            {rowsMapped.length - validCount > 0 && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30">{rowsMapped.length - validCount} incomplète(s)</Badge>
            )}
            {duplicateCount > 0 && (
              <Badge className="bg-accent/20 text-accent-foreground border-accent/30">{duplicateCount} doublon(s) détecté(s)</Badge>
            )}
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsMapped.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    {fields.map((f) => <TableCell key={f.key} className="text-xs">{row[f.key] || "—"}</TableCell>)}
                    <TableCell>
                      {!isRowValid(row) ? (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">Incomplète</Badge>
                      ) : isDuplicate(row) ? (
                        <Badge variant="outline" className="text-[10px] bg-accent/20 text-accent-foreground border-accent/30">Doublon (ignorée)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary-dark border-primary/30">Import OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rowsMapped.length > 20 && (
            <p className="text-xs text-muted-foreground">Aperçu limité aux 20 premières lignes — les {rowsMapped.length - 20} autres seront traitées de la même façon.</p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-1.5" onClick={() => setStep("mapping")}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button className="gap-1.5" onClick={runImport} disabled={importing || validCount - duplicateCount <= 0}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Importer {validCount - duplicateCount} ligne(s)</>}
            </Button>
          </div>
        </div>
      )}

      {/* Step: done */}
      {step === "done" && report && (
        <div className="rounded-xl border bg-card p-6 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 text-primary-dark mx-auto" />
          <p className="font-medium">Import terminé</p>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <span>{report.created} créée(s)</span>
            <span>{report.skipped} ignorée(s)</span>
            {report.errors > 0 && (
              <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {report.errors} erreur(s)</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={reset}>Nouvel import</Button>
        </div>
      )}
    </div>
  );
}
