import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, LayoutDashboard, CheckCircle2 } from "lucide-react";

interface PostSignupChoiceProps {
  open: boolean;
  name: string;
  onContinueBooking: () => void;
  onGoToSpace: () => void;
  hasBookingInProgress?: boolean;
}

export default function PostSignupChoice({ open, name, onContinueBooking, onGoToSpace, hasBookingInProgress = true }: PostSignupChoiceProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onGoToSpace()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Compte créé !
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Bienvenue {name}. Que souhaitez-vous faire maintenant ?
        </p>
        <div className="grid gap-2 pt-2">
          {hasBookingInProgress && (
            <Button className="w-full gap-2" onClick={onContinueBooking}>
              <CalendarCheck className="h-4 w-4" /> Continuer votre réservation
            </Button>
          )}
          <Button variant={hasBookingInProgress ? "outline" : "default"} className="w-full gap-2" onClick={onGoToSpace}>
            <LayoutDashboard className="h-4 w-4" /> Découvrir votre espace client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
