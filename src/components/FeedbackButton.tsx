import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Loader2, CheckCircle2, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { makeDisplayName } from "@/lib/client-name";

const PRIORITIES = [
  { value: "urgent", label: "Urgent", detail: "sous 4h" },
  { value: "important", label: "Important", detail: "sous 1-3 jours" },
  { value: "discuss", label: "Pour en parler", detail: "sous 7 jours" },
];

export default function FeedbackButton() {
  const { session, clientProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("important");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isIdentified = !!session;

  const reset = () => {
    setMessage("");
    setPriority("important");
    setName("");
    setPhone("");
    setSent(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    const authorName = isIdentified
      ? (isAdmin ? "Élodie" : makeDisplayName(clientProfile?.first_name || "", clientProfile?.last_name || "") || clientProfile?.email || "Client connecté")
      : (name.trim() || "Anonyme");
    const authorPhone = isIdentified ? (clientProfile?.phone || null) : (phone.trim() || null);
    const { error } = await supabase.from("dev_feedback").insert({
      message: message.trim(),
      priority,
      author_name: authorName,
      author_phone: authorPhone,
      author_role: isAdmin ? "admin" : isIdentified ? "client" : "visiteur",
    } as any);
    setSending(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        className="fixed bottom-20 md:bottom-6 right-4 z-30 flex items-center gap-1.5 bg-primary-dark text-primary-dark-foreground rounded-full px-4 py-3 shadow-lg hover:opacity-90 transition-opacity text-sm font-medium"
      >
        <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Feedback</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Envoyer un feedback</SheetTitle>
          </SheetHeader>
          {sent ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-primary-dark mx-auto" />
              <p className="text-sm">Merci, c'est envoyé !</p>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2 pb-6">
              <div>
                <Label className="text-sm">Quoi ?</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Votre commentaire, bug, idée..." className="mt-1.5" />
              </div>

              <div>
                <Label className="text-sm">Priorité selon vous ?</Label>
                <div className="flex flex-col gap-2 mt-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex items-center justify-between rounded-lg border p-3 text-sm text-left transition-colors ${
                        priority === p.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!isIdentified && (
                <div className="space-y-2">
                  <Label className="text-sm">Vous</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone (optionnel)" type="tel" />
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" /> Contact développeur : Clément, 06 77 30 01 27
              </div>

              <Button className="w-full gap-1.5" onClick={handleSubmit} disabled={sending || !message.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Envoyer
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
