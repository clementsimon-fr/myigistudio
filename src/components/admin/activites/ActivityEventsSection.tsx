import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, X, Clock, Users, CalendarIcon, Repeat, Mail, MapPin, Copy, Info, Trash2, CalendarRange, MoreVertical,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CustomDatesPicker } from "./CustomDatesPicker";
import { TemplateEditor } from "./TemplateEditor";
import {
  DAYS, FREQUENCY_OPTIONS, REMINDER_VARIABLES, MODALITIES_VARIABLES, calcDuration, emptyEvent,
  type ActivityForm, type EventSlot,
} from "./types";

interface ActivityEventsSectionProps {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
}

export function ActivityEventsSection({ form, setForm }: ActivityEventsSectionProps) {
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [detailDialogIdx, setDetailDialogIdx] = useState<number | null>(null);
  const [pendingDeleteEventIdx, setPendingDeleteEventIdx] = useState<number | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const removeEvent = (idx: number) => {
    setForm(prev => ({ ...prev, events: prev.events.filter((_, i) => i !== idx) }));
  };
  const updateEvent = (idx: number, patch: Partial<EventSlot>) => {
    setForm(prev => ({ ...prev, events: prev.events.map((e, i) => i === idx ? { ...e, ...patch } : e) }));
  };
  const duplicateEvent = (idx: number) => {
    setForm(prev => {
      const cloned = {
        ...prev.events[idx],
        _scheduleId: undefined,
        _workshopId: undefined,
        _linkedGroup: undefined,
        _linkedWorkshopIds: undefined,
      };
      const newEvents = [...prev.events];
      newEvents.splice(idx + 1, 0, cloned);
      return { ...prev, events: newEvents };
    });
  };

  // Ponctuel events live on the calendar; recurring & multi-sessions live below as cards.
  const ponctuelEvents = useMemo(
    () => form.events.map((evt, idx) => ({ evt, idx })).filter(({ evt }) => evt.type === "ponctuel" && evt.date),
    [form.events],
  );
  const calendarSelectedDates = ponctuelEvents.map(({ evt }) => new Date(evt.date + "T12:00:00"));
  const otherEvents = useMemo(
    () => form.events.map((evt, idx) => ({ evt, idx })).filter(({ evt }) => evt.type !== "ponctuel"),
    [form.events],
  );

  const eventsOnSheetDate = useMemo(
    () => sheetDate ? ponctuelEvents.filter(({ evt }) => evt.date === sheetDate) : [],
    [ponctuelEvents, sheetDate],
  );

  const addEvent = (type: "recurring" | "ponctuel" | "multi-sessions") => {
    if (type === "ponctuel") {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      setForm(prev => ({ ...prev, events: [...prev.events, { ...emptyEvent(), type: "ponctuel", date: todayStr }] }));
      setCalMonth(new Date());
      setSheetDate(todayStr);
    } else {
      setForm(prev => ({ ...prev, events: [...prev.events, { ...emptyEvent(), type }] }));
    }
    setAddMenuOpen(false);
  };

  const sheetDateLabel = sheetDate
    ? new Date(sheetDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="relative">
        <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddMenuOpen(!addMenuOpen)}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une date
        </Button>
        {addMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg z-20 py-1 min-w-[200px]">
            <button className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted w-full text-left" onClick={() => addEvent("ponctuel")}>
              <CalendarIcon className="h-3.5 w-3.5" /> Date ponctuelle
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted w-full text-left" onClick={() => addEvent("recurring")}>
              <Repeat className="h-3.5 w-3.5" /> Créneau récurrent
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted w-full text-left" onClick={() => addEvent("multi-sessions")}>
              <CalendarRange className="h-3.5 w-3.5" /> Série multi-sessions
            </button>
          </div>
        )}
      </div>

      {/* Calendar — dates ponctuelles */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Dates ponctuelles</Label>
        <div className="border rounded-lg p-4 bg-muted/10">
          <Calendar
            mode="multiple"
            selected={calendarSelectedDates}
            onSelect={(_, selectedDay) => {
              if (!selectedDay) return;
              setSheetDate(format(selectedDay, "yyyy-MM-dd"));
            }}
            month={calMonth}
            onMonthChange={setCalMonth}
            className="p-3 pointer-events-auto"
            locale={fr}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Cliquez sur une date pour l'ajouter, la modifier ou la supprimer.</p>
      </div>

      {/* Récurrents & séries multi-sessions */}
      {otherEvents.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Créneaux récurrents & séries</Label>
          {otherEvents.map(({ evt, idx }) => (
            <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={evt.type} onValueChange={v => updateEvent(idx, { type: v as "recurring" | "multi-sessions" })}>
                    <SelectTrigger className="w-[155px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring"><span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> Récurrent</span></SelectItem>
                      <SelectItem value="multi-sessions"><span className="flex items-center gap-1"><CalendarRange className="h-3 w-3" /> Multi-sessions</span></SelectItem>
                    </SelectContent>
                  </Select>
                  {evt.type === "recurring" && (
                    <Select value={evt.frequency} onValueChange={v => updateEvent(idx, { frequency: v })}>
                      <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Actions">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDetailDialogIdx(idx)}>
                      <Info className="h-3.5 w-3.5" /> Modalités de ce créneau
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateEvent(idx)}>
                      <Copy className="h-3.5 w-3.5" /> Dupliquer
                    </DropdownMenuItem>
                    {form.events.length > 1 && (
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setPendingDeleteEventIdx(idx)}>
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {evt.type === "multi-sessions" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input type="time" className="w-[90px] h-8 text-xs" value={evt.time} onChange={e => updateEvent(idx, { time: e.target.value })} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input type="time" className="w-[90px] h-8 text-xs" value={evt.end_time} onChange={e => updateEvent(idx, { end_time: e.target.value })} />
                    </div>
                    {evt.time && evt.end_time && <span className="text-xs text-muted-foreground">{calcDuration(evt.time, evt.end_time)}</span>}
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input type="number" className="w-[70px] h-8 text-xs" value={evt.spots} onChange={e => updateEvent(idx, { spots: Number(e.target.value) })} placeholder="Places" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(evt.linkedDates || []).map((d, di) => (
                      <div key={di} className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input type="date" className="w-[150px] h-8 text-xs" value={d}
                          onChange={e => {
                            const newDates = [...(evt.linkedDates || [])];
                            newDates[di] = e.target.value;
                            updateEvent(idx, { linkedDates: newDates });
                          }} />
                        {(evt.linkedDates || []).length > 1 && (
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => {
                              const newDates = (evt.linkedDates || []).filter((_, i) => i !== di);
                              updateEvent(idx, { linkedDates: newDates });
                            }}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => updateEvent(idx, { linkedDates: [...(evt.linkedDates || []), ""] })}>
                      <Plus className="h-3 w-3" /> Ajouter une date
                    </Button>
                  </div>
                </div>
              ) : evt.frequency === "personnalise" ? (
                <CustomDatesPicker
                  dates={evt.customDates}
                  onChange={dates => updateEvent(idx, { customDates: dates })}
                  time={evt.time} endTime={evt.end_time} spots={evt.spots}
                  onTimeChange={v => updateEvent(idx, { time: v })}
                  onEndTimeChange={v => updateEvent(idx, { end_time: v })}
                  onSpotsChange={v => updateEvent(idx, { spots: v })}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={evt.day} onValueChange={v => updateEvent(idx, { day: v })}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Input type="time" className="w-[90px] h-8 text-xs" value={evt.time} onChange={e => updateEvent(idx, { time: e.target.value })} />
                    <span className="text-muted-foreground text-xs">→</span>
                    <Input type="time" className="w-[90px] h-8 text-xs" value={evt.end_time} onChange={e => updateEvent(idx, { end_time: e.target.value })} />
                  </div>
                  {evt.time && evt.end_time && <span className="text-xs text-muted-foreground">{calcDuration(evt.time, evt.end_time)}</span>}
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input type="number" className="w-[70px] h-8 text-xs" value={evt.spots} onChange={e => updateEvent(idx, { spots: Number(e.target.value) })} placeholder="Places" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form.events.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucun événement. Ajoutez une date ponctuelle ou un créneau récurrent.
        </div>
      )}

      {/* ═══ Panneau bas d'écran : détail d'une date ponctuelle ═══ */}
      {/* Overlay custom (pas un Sheet Radix) pour éviter les conflits d'empilement avec le Sheet éditeur parent */}
      {sheetDate && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setSheetDate(null)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="relative w-full sm:max-w-2xl bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold capitalize">{sheetDateLabel}</h3>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSheetDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          <div className="space-y-3 pb-4">
            {eventsOnSheetDate.length > 0 ? eventsOnSheetDate.map(({ idx }) => {
              const evt = form.events[idx];
              return (
                <div key={idx} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="date" className="w-[150px] h-9 text-sm" value={evt.date} onChange={e => updateEvent(idx, { date: e.target.value })} />
                    <div className="flex items-center gap-1">
                      <Input type="time" className="w-[100px] h-9 text-sm" value={evt.time} onChange={e => updateEvent(idx, { time: e.target.value })} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input type="time" className="w-[100px] h-9 text-sm" value={evt.end_time} onChange={e => updateEvent(idx, { end_time: e.target.value })} />
                    </div>
                  </div>
                  {evt.time && evt.end_time && <span className="text-xs text-muted-foreground">{calcDuration(evt.time, evt.end_time)}</span>}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="w-[80px] h-9 text-sm" value={evt.spots} onChange={e => updateEvent(idx, { spots: Number(e.target.value) })} placeholder="Places" />
                    <span className="text-xs text-muted-foreground">places</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setDetailDialogIdx(idx)}>
                      <Info className="h-3.5 w-3.5" /> Modalités de ce créneau
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="gap-1.5 text-xs"
                      onClick={() => setPendingDeleteEventIdx(idx)}>
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </Button>
                  </div>
                </div>
              );
            }) : (
              <>
                <p className="text-sm text-muted-foreground">Aucune date ponctuelle ce jour-là.</p>
                <Button type="button" variant="outline" className="w-full gap-1.5"
                  onClick={() => {
                    if (!sheetDate) return;
                    setForm(prev => ({ ...prev, events: [...prev.events, { ...emptyEvent(), type: "ponctuel", date: sheetDate }] }));
                  }}>
                  <Plus className="h-4 w-4" /> Ajouter une date le {sheetDate ? new Date(sheetDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}
                </Button>
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ═══ MODALITÉS DE CE CRÉNEAU (override) ═══ */}
      <Dialog open={detailDialogIdx !== null} onOpenChange={open => { if (!open) setDetailDialogIdx(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Modalités de ce créneau</DialogTitle>
          </DialogHeader>
          {detailDialogIdx !== null && (() => {
            const evt = form.events[detailDialogIdx];
            if (!evt) return null;
            const isReminderCustom = !!evt.reminder_template;
            const isModalitiesCustom = !!evt.modalities;
            return (
              <div className="space-y-5 pt-2">
                <p className="text-xs text-muted-foreground -mt-2">
                  Par défaut, ce créneau utilise les consignes et le message défini dans la rubrique « Modalités » de l'activité. Personnalisez-les ici uniquement pour ce créneau précis.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Consignes</Label>
                    <div className="flex gap-1.5">
                      <Button type="button" size="sm" variant={!isModalitiesCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                        onClick={() => updateEvent(detailDialogIdx, { modalities: "" })}>
                        Par défaut
                      </Button>
                      <Button type="button" size="sm" variant={isModalitiesCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                        onClick={() => { if (!isModalitiesCustom) updateEvent(detailDialogIdx, { modalities: form.default_modalities }); }}>
                        Personnalisé
                      </Button>
                    </div>
                  </div>
                  <TemplateEditor
                    value={isModalitiesCustom ? evt.modalities : form.default_modalities}
                    onChange={v => updateEvent(detailDialogIdx, { modalities: v })}
                    variables={MODALITIES_VARIABLES}
                    readOnly={!isModalitiesCustom}
                  />
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Message avant le cours</Label>
                    <div className="flex gap-1.5">
                      <Button type="button" size="sm" variant={!isReminderCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                        onClick={() => updateEvent(detailDialogIdx, { reminder_template: "" })}>
                        Par défaut
                      </Button>
                      <Button type="button" size="sm" variant={isReminderCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                        onClick={() => { if (!isReminderCustom) updateEvent(detailDialogIdx, { reminder_template: form.default_reminder }); }}>
                        Personnalisé
                      </Button>
                    </div>
                  </div>
                  <TemplateEditor
                    value={isReminderCustom ? evt.reminder_template : form.default_reminder}
                    onChange={v => updateEvent(detailDialogIdx, { reminder_template: v })}
                    variables={REMINDER_VARIABLES}
                    readOnly={!isReminderCustom}
                    showInsertModalities={true}
                  />
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDeleteEventIdx !== null} onOpenChange={(open) => !open && setPendingDeleteEventIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce créneau sera retiré de l'activité après confirmation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteEventIdx !== null) removeEvent(pendingDeleteEventIdx);
                setPendingDeleteEventIdx(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
