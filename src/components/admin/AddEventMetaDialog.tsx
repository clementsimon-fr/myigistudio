import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CalendarRange, Link2, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type EventType = "single" | "multi" | "linked";

interface ActivityOption {
  id: string;
  name: string;
  category: string;
  instructor: string;
  instructor_id: string | null;
  source: "course" | "workshop";
  default_price: number;
  default_card_yoga_count: number;
  default_inclusions: string;
  default_spots: number;
  default_time: string;
  default_end_time: string;
}

interface AddEventMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface DateConfig {
  date: string;
  time: string;
  end_time: string;
}

export function AddEventMetaDialog({ open, onOpenChange, onCreated }: AddEventMetaDialogProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [eventType, setEventType] = useState<EventType>("single");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [perDateConfigs, setPerDateConfigs] = useState<DateConfig[]>([]);
  const [commonTime, setCommonTime] = useState("09:00");
  const [commonEndTime, setCommonEndTime] = useState("10:00");
  const [spots, setSpots] = useState(12);
  const [price, setPrice] = useState(0);
  const [cardYogaCount, setCardYogaCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => activities.find(a => a.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [coursesRes, workshopsRes] = await Promise.all([
        supabase.from("courses").select("id, name, category, instructor, instructor_id, price, card_yoga_count, inclusions, spots, time, end_time"),
        supabase.from("workshops").select("id, name, category, instructor_id, price, card_yoga_count, inclusions, spots, time, end_time"),
      ]);
      const byName = new Map<string, ActivityOption>();
      for (const c of (coursesRes.data || []) as any[]) {
        if (byName.has(c.name)) continue;
        byName.set(c.name, {
          id: c.id, name: c.name, category: c.category, instructor: c.instructor || "",
          instructor_id: c.instructor_id, source: "course",
          default_price: Number(c.price || 0), default_card_yoga_count: Number(c.card_yoga_count || 1),
          default_inclusions: c.inclusions || "", default_spots: Number(c.spots || 12),
          default_time: c.time || "09:00", default_end_time: c.end_time || "10:00",
        });
      }
      for (const w of (workshopsRes.data || []) as any[]) {
        if (byName.has(w.name)) continue;
        byName.set(w.name, {
          id: w.id, name: w.name, category: w.category, instructor: "",
          instructor_id: w.instructor_id, source: "workshop",
          default_price: Number(w.price || 0), default_card_yoga_count: Number(w.card_yoga_count || 1),
          default_inclusions: w.inclusions || "", default_spots: Number(w.spots || 12),
          default_time: w.time || "09:00", default_end_time: w.end_time || "10:00",
        });
      }
      const list = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
      setActivities(list);
    })();
  }, [open]);

  // Préremplir prix/places/horaire à la sélection d'activité
  useEffect(() => {
    if (selected) {
      setSpots(selected.default_spots);
      setPrice(selected.default_price);
      setCardYogaCount(selected.default_card_yoga_count);
      setCommonTime(selected.default_time);
      setCommonEndTime(selected.default_end_time);
    }
  }, [selected]);

  // Sync perDateConfigs when selectedDates change in linked mode
  useEffect(() => {
    if (eventType === "linked") {
      setPerDateConfigs(prev => {
        const map = new Map(prev.map(c => [c.date, c]));
        return selectedDates.map(d => map.get(d) || { date: d, time: commonTime, end_time: commonEndTime });
      });
    }
  }, [selectedDates, eventType, commonTime, commonEndTime]);

  const reset = () => {
    setSelectedActivityId("");
    setEventType("single");
    setSelectedDates([]);
    setPerDateConfigs([]);
    setCommonTime("09:00");
    setCommonEndTime("10:00");
    setSpots(12);
    setPrice(0);
    setCardYogaCount(1);
    setNotes("");
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const toggleDate = (d: Date | undefined) => {
    if (!d) return;
    const s = format(d, "yyyy-MM-dd");
    if (eventType === "single") {
      setSelectedDates([s]);
      return;
    }
    setSelectedDates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s].sort());
  };

  const handleSave = async () => {
    if (!selected) {
      toast({ title: "Sélectionnez une activité", variant: "destructive" });
      return;
    }
    if (selectedDates.length === 0) {
      toast({ title: "Sélectionnez au moins une date", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      const linkedGroupId = eventType === "linked" ? crypto.randomUUID() : null;
      const rows: any[] = [];

      if (eventType === "single" || eventType === "multi") {
        for (const date of selectedDates) {
          rows.push({
            name: selected.name,
            category: selected.category,
            instructor_id: selected.instructor_id,
            date,
            time: commonTime,
            end_time: commonEndTime,
            duration: "",
            spots,
            spots_left: spots,
            price,
            card_yoga_count: cardYogaCount,
            inclusions: selected.default_inclusions,
            description: notes,
            frequency: eventType === "single" ? "ponctuel" : "multi-sessions",
            linked_group: null,
          });
        }
      } else {
        // linked / stage : 1 ligne par date, même linked_group, mais time/end_time propres
        for (const cfg of perDateConfigs) {
          rows.push({
            name: selected.name,
            category: selected.category,
            instructor_id: selected.instructor_id,
            date: cfg.date,
            time: cfg.time,
            end_time: cfg.end_time,
            duration: "",
            spots,
            spots_left: spots,
            price,
            card_yoga_count: cardYogaCount,
            inclusions: selected.default_inclusions,
            description: notes,
            frequency: "multi-sessions",
            linked_group: linkedGroupId,
          });
        }
      }

      const { error } = await supabase.from("workshops").insert(rows);
      if (error) throw error;

      toast({ title: `${rows.length} événement${rows.length > 1 ? "s" : ""} ajouté${rows.length > 1 ? "s" : ""} ✓` });
      close();
      onCreated();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const calendarSelected = selectedDates.map(d => new Date(d + "T12:00:00"));

  return (
    <Dialog open={open} onOpenChange={(v) => v ? onOpenChange(v) : close()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter un événement</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Bloc 1 : choisir l'activité */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">1. Activité</Label>
            <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
              <SelectTrigger><SelectValue placeholder="Choisir une activité..." /></SelectTrigger>
              <SelectContent>
                {activities.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bloc 2 : type d'événement */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">2. Type d'événement</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { v: "single" as EventType, icon: CalendarIcon, label: "Une date", desc: "Un événement à une date" },
                { v: "multi" as EventType, icon: CalendarRange, label: "Plusieurs dates", desc: "Même créneau, plusieurs dates" },
                { v: "linked" as EventType, icon: Link2, label: "Stage (dates liées)", desc: "Heure spécifique par date" },
              ].map(opt => {
                const Icon = opt.icon;
                const active = eventType === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => { setEventType(opt.v); setSelectedDates([]); }}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{opt.label}</span>
                      {active && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloc 3 : sélection des dates */}
          {selectedActivityId && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                3. {eventType === "single" ? "Choisir la date" : "Choisir les dates"}
              </Label>
              <div className="border rounded-lg p-2 bg-muted/10 inline-block">
                <Calendar
                  mode="multiple"
                  selected={calendarSelected}
                  onSelect={(_, d) => toggleDate(d)}
                  locale={fr}
                  className="pointer-events-auto"
                />
              </div>
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedDates.map(d => (
                    <Badge key={d} variant="secondary" className="text-xs">
                      {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bloc 4 : configuration */}
          {selectedActivityId && selectedDates.length > 0 && (
            <div className="space-y-4 border rounded-lg p-4 bg-card">
              <Label className="text-sm font-semibold">4. Configuration</Label>

              {eventType === "linked" ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Précisez l'heure pour chaque date :</p>
                  {perDateConfigs.map((cfg, idx) => (
                    <div key={cfg.date} className="flex items-center gap-2">
                      <span className="text-xs w-32 shrink-0">
                        {new Date(cfg.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <Input type="time" className="w-[100px] h-8 text-xs" value={cfg.time}
                        onChange={e => setPerDateConfigs(prev => prev.map((c, i) => i === idx ? { ...c, time: e.target.value } : c))} />
                      <span className="text-xs text-muted-foreground">→</span>
                      <Input type="time" className="w-[100px] h-8 text-xs" value={cfg.end_time}
                        onChange={e => setPerDateConfigs(prev => prev.map((c, i) => i === idx ? { ...c, end_time: e.target.value } : c))} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-xs">Horaire :</Label>
                  <Input type="time" className="w-[100px] h-8 text-xs" value={commonTime} onChange={e => setCommonTime(e.target.value)} />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input type="time" className="w-[100px] h-8 text-xs" value={commonEndTime} onChange={e => setCommonEndTime(e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Places</Label>
                  <Input type="number" value={spots} onChange={e => setSpots(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Prix (€)</Label>
                  <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Carte(s) yoga</Label>
                  <Input type="number" value={cardYogaCount} onChange={e => setCardYogaCount(Number(e.target.value))} className="h-8 text-xs" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Notes complémentaires</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs"
                  placeholder="Informations spécifiques à cet événement..." />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={close} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !selectedActivityId || selectedDates.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer {selectedDates.length > 0 && `(${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
