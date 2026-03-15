import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Loader2, Check } from "lucide-react";

interface MockStripeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  description: string;
}

export default function MockStripeModal({ open, onClose, onSuccess, amount, description }: MockStripeModalProps) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onSuccess();
      }, 1200);
    }, 1500);
  };

  const handleClose = () => {
    if (!processing) {
      setDone(false);
      setProcessing(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[hsl(220,20%,14%)] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-sans">
            <div className="h-8 w-8 rounded bg-[hsl(250,80%,60%)] flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            MyIgiStudio
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold text-emerald-400">Paiement confirmé !</p>
            <p className="text-sm text-white/60">{description}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <p className="text-sm text-white/60">Détail</p>
              <p className="text-sm font-medium">{description}</p>
              <p className="text-2xl font-bold mt-1">{amount.toFixed(2)} €</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-white/60">Numéro de carte</Label>
                <Input
                  value="4242 4242 4242 4242"
                  readOnly
                  className="bg-white/5 border-white/10 text-white font-mono mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/60">Expiration</Label>
                  <Input
                    value="12/28"
                    readOnly
                    className="bg-white/5 border-white/10 text-white font-mono mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/60">CVC</Label>
                  <Input
                    value="424"
                    readOnly
                    className="bg-white/5 border-white/10 text-white font-mono mt-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handlePay}
              disabled={processing}
              className="w-full h-11 bg-[hsl(250,80%,60%)] hover:bg-[hsl(250,80%,55%)] text-white font-semibold"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-1.5" />
                  Payer {amount.toFixed(2)} €
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/40">
              <Lock className="h-3 w-3" />
              <span>Paiement simulé — Mode démo</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
