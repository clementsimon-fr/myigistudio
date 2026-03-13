import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Check, Clock, Users } from "lucide-react";
import { services, yogaSchedule, workshops } from "@/data/mockData";
import { fr } from "date-fns/locale";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { num: 1, label: "Prestation" },
  { num: 2, label: "Date & Créneau" },
  { num: 3, label: "Participants" },
  { num: 4, label: "Confirmation" },
];

export default function Reserver() {
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState("");
  const [participants, setParticipants] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  // Get available slots based on selected service and date
  const getSlots = () => {
    if (!selectedDate) return [];
    const dayName = selectedDate.toLocaleDateString("fr-FR", { weekday: "long" });
    const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    if (selectedService === "yoga") {
      return yogaSchedule.filter((c) => c.day === dayCapitalized);
    }
    if (selectedService === "poterie" || selectedService === "ateliers") {
      const dateStr = selectedDate.toISOString().split("T")[0];
      return workshops
        .filter((w) => w.date === dateStr)
        .map((w) => ({
          id: w.id,
          name: w.name,
          time: w.time,
          duration: w.duration,
          instructor: "Élodie",
          spots: w.spots,
          spotsLeft: w.spotsLeft,
          day: "",
        }));
    }
    return [];
  };

  const slots = getSlots();
  const selectedSlotData = slots.find((s) => s.id === selectedSlot);

  const handleConfirm = () => {
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-primary-dark" />
            </div>
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réservation confirmée !</h1>
            <p className="text-muted-foreground mb-6">
              Votre réservation a été enregistrée. Vous recevrez un email de confirmation.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/mon-espace">
                <Button>Voir mes réservations</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark mb-6">Réserver</h1>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    step === s.num
                      ? "bg-primary-dark text-primary-dark-foreground"
                      : step > s.num
                        ? "bg-primary/20 text-primary-dark"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                    {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step 1: Choix prestation */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary-dark">Choisissez une prestation</h2>
              <RadioGroup value={selectedService} onValueChange={setSelectedService}>
                {services.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 rounded-lg border bg-card p-4 cursor-pointer hover:border-primary-dark transition-colors">
                    <RadioGroupItem value={s.id} id={s.id} />
                    <Label htmlFor={s.id} className="flex-1 cursor-pointer">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!selectedService} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Créneau */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary-dark">Choisissez une date et un créneau</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl border bg-card p-4 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedSlot(""); }}
                    locale={fr}
                    disabled={{ before: new Date() }}
                  />
                </div>
                <div>
                  {selectedDate ? (
                    slots.length > 0 ? (
                      <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-2">
                        {slots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:border-primary-dark transition-colors ${
                              slot.spotsLeft === 0 ? "opacity-50" : ""
                            }`}
                          >
                            <RadioGroupItem value={slot.id} id={`slot-${slot.id}`} disabled={slot.spotsLeft === 0} />
                            <Label htmlFor={`slot-${slot.id}`} className="flex-1 cursor-pointer">
                              <p className="font-medium text-sm">{slot.name}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {slot.time} · {slot.duration}</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {slot.spotsLeft} place{slot.spotsLeft > 1 ? "s" : ""}</span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">Aucun créneau disponible pour cette date.</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">Sélectionnez une date dans le calendrier.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedSlot} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Participants */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary-dark">Pour combien de personnes ?</h2>
              <div className="rounded-xl border bg-card p-6 max-w-sm">
                <Label htmlFor="participants">Nombre de participants</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Button size="icon" variant="outline" onClick={() => setParticipants(Math.max(1, participants - 1))}>-</Button>
                  <Input
                    id="participants"
                    type="number"
                    min={1}
                    max={selectedSlotData?.spotsLeft || 10}
                    value={participants}
                    onChange={(e) => setParticipants(Number(e.target.value))}
                    className="w-20 text-center"
                  />
                  <Button size="icon" variant="outline" onClick={() => setParticipants(Math.min(selectedSlotData?.spotsLeft || 10, participants + 1))}>+</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedSlotData?.spotsLeft} places disponibles
                </p>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(4)} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Récapitulatif */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary-dark">Récapitulatif</h2>
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestation</span>
                  <span className="font-medium">{services.find((s) => s.id === selectedService)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créneau</span>
                  <span className="font-medium">{selectedSlotData?.name} · {selectedSlotData?.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants</span>
                  <span className="font-medium">{participants} personne{participants > 1 ? "s" : ""}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">Crédits utilisés</span>
                  <Badge className="bg-primary-dark text-primary-dark-foreground">{participants} crédit{participants > 1 ? "s" : ""}</Badge>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleConfirm} className="bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-1.5">
                  <Check className="h-4 w-4" /> Confirmer la réservation
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
