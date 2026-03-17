import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConfirmationPopupProps {
  open: boolean;
  activityName: string;
  date: Date;
  time: string;
  isGuest: boolean;
  onViewReservation: () => void;
}

export default function ConfirmationPopup({ open, activityName, date, time, isGuest, onViewReservation }: ConfirmationPopupProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md text-center" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center py-4 gap-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-display font-bold text-primary-dark">Réservation confirmée !</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>{activityName}</p>
            <p>{date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {time}</p>
          </div>
          {!isGuest && (
            <Button onClick={onViewReservation} className="w-full mt-2">
              Voir ma réservation
            </Button>
          )}
          {isGuest && (
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground">
                Vous recevrez un email de confirmation avec les détails.
              </p>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
