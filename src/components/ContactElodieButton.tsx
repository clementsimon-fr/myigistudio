import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function ContactElodieButton({ variant = "outline", className = "" }: { variant?: "outline" | "ghost" | "link"; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size="sm" className={`gap-1.5 text-xs ${className}`} onClick={() => setOpen(true)}>
        <MessageCircle className="h-3.5 w-3.5" /> Contacter Élodie
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-primary-dark">Contacter Élodie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Vous avez une question ? N'hésitez pas à contacter Élodie directement :
            </p>
            <div className="space-y-2">
              <a
                href="mailto:igistudiofr@gmail.com"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                📧 igistudiofr@gmail.com
              </a>
              <a
                href="tel:+33662299213"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                📱 06 62 29 92 13
              </a>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
