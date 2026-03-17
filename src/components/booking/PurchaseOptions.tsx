import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, ShoppingCart, Star, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import FormulaInfoModal from "./FormulaInfoModal";

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  sort_order: number;
  payment_info: string;
}

type UserState = "guest" | "logged_user_no_cards" | "logged_user_with_cards";

interface PurchaseOptionsProps {
  userState: UserState;
  category: string; // "yoga" | "poterie" | "atelier" etc.
  credits: number;
  userName: string;
  pricingCards: PricingCard[];
  unitPrice: number | null;
  onReserveWithCard: () => void;
  onBuyCard: (card: PricingCard) => void;
  onBuyUnit: () => void;
  onUseVoucher: (code: string) => void;
  onCreateAccount: () => void;
  voucherStatus: "idle" | "valid" | "invalid" | "checking";
  onVoucherCodeChange: () => void;
}

export default function PurchaseOptions({
  userState, category, credits, userName, pricingCards, unitPrice,
  onReserveWithCard, onBuyCard, onBuyUnit, onUseVoucher, onCreateAccount,
  voucherStatus, onVoucherCodeChange,
}: PurchaseOptionsProps) {
  const [showVoucher, setShowVoucher] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [showFormulas, setShowFormulas] = useState(false);
  const isYoga = category === "yoga";

  // ─── YOGA — connected with cards ───
  if (isYoga && userState === "logged_user_with_cards") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-medium text-primary-dark">
            <CreditCard className="h-4 w-4 inline mr-1.5" />
            Cartes yoga disponibles : <strong>{credits}</strong>
          </p>
        </div>

        <Button onClick={onReserveWithCard} className="w-full h-12 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 text-base font-semibold gap-2">
          <CreditCard className="h-5 w-5" /> Réserver avec 1 carte
        </Button>
        <p className="text-xs text-muted-foreground text-center -mt-2">1 carte sera déduite après confirmation.</p>

        <div className="grid gap-2">
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowFormulas(true)}>
            <ShoppingCart className="h-4 w-4" /> Acheter des cartes yoga
          </Button>
          <VoucherButton showVoucher={showVoucher} setShowVoucher={setShowVoucher} voucherCode={voucherCode} setVoucherCode={setVoucherCode} onUseVoucher={onUseVoucher} voucherStatus={voucherStatus} onVoucherCodeChange={onVoucherCodeChange} />
        </div>

        {showFormulas && (
          <CardGrid pricingCards={pricingCards} unitPrice={unitPrice} onBuyCard={onBuyCard} />
        )}
      </div>
    );
  }

  // ─── YOGA — connected without cards ───
  if (isYoga && userState === "logged_user_no_cards") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 border p-4">
          <p className="text-sm font-medium text-muted-foreground">
            <CreditCard className="h-4 w-4 inline mr-1.5" />
            Cartes yoga disponibles : <strong>0</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {userName}, achetez des cartes yoga pour réserver vos cours.
          </p>
        </div>

        <CardGrid pricingCards={pricingCards} unitPrice={unitPrice} onBuyCard={onBuyCard} />

        <VoucherButton showVoucher={showVoucher} setShowVoucher={setShowVoucher} voucherCode={voucherCode} setVoucherCode={setVoucherCode} onUseVoucher={onUseVoucher} voucherStatus={voucherStatus} onVoucherCodeChange={onVoucherCodeChange} />
      </div>
    );
  }

  // ─── YOGA — guest ───
  if (isYoga && userState === "guest") {
    return (
      <div className="space-y-4">
        <div className="grid gap-2">
          <Button onClick={onBuyUnit} className="w-full gap-2 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90">
            <ShoppingCart className="h-4 w-4" /> Acheter un cours à l'unité
          </Button>
          <VoucherButton showVoucher={showVoucher} setShowVoucher={setShowVoucher} voucherCode={voucherCode} setVoucherCode={setVoucherCode} onUseVoucher={onUseVoucher} voucherStatus={voucherStatus} onVoucherCodeChange={onVoucherCodeChange} />
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowFormulas(true)}>
            <Eye className="h-4 w-4" /> Voir les formules
          </Button>
        </div>

        <FormulaInfoModal
          open={showFormulas}
          onClose={() => setShowFormulas(false)}
          onCreateAccount={onCreateAccount}
          onContinueWithout={() => setShowFormulas(false)}
          pricingCards={pricingCards}
        />
      </div>
    );
  }

  // ─── POTERIE / ATELIERS — tous utilisateurs ───
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Button onClick={onBuyUnit} className="w-full gap-2 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90">
          <ShoppingCart className="h-4 w-4" /> Acheter à l'unité
        </Button>
        <VoucherButton showVoucher={showVoucher} setShowVoucher={setShowVoucher} voucherCode={voucherCode} setVoucherCode={setVoucherCode} onUseVoucher={onUseVoucher} voucherStatus={voucherStatus} onVoucherCodeChange={onVoucherCodeChange} />
      </div>
    </div>
  );
}

// ─── Sub: Voucher input ───
function VoucherButton({ showVoucher, setShowVoucher, voucherCode, setVoucherCode, onUseVoucher, voucherStatus, onVoucherCodeChange }: {
  showVoucher: boolean; setShowVoucher: (v: boolean) => void;
  voucherCode: string; setVoucherCode: (v: string) => void;
  onUseVoucher: (code: string) => void;
  voucherStatus: "idle" | "valid" | "invalid" | "checking";
  onVoucherCodeChange: () => void;
}) {
  if (!showVoucher) {
    return (
      <Button variant="outline" className="w-full gap-2" onClick={() => setShowVoucher(true)}>
        <Gift className="h-4 w-4" /> Utiliser un bon cadeau
      </Button>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium text-primary-dark flex items-center gap-1.5">
        <Gift className="h-4 w-4" /> Saisir un code bon cadeau
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="IGI-XXXXXXXX"
          value={voucherCode}
          onChange={e => { setVoucherCode(e.target.value.toUpperCase()); onVoucherCodeChange(); }}
          className="font-mono text-sm"
        />
        <Button size="sm" variant="outline" disabled={!voucherCode.trim() || voucherStatus === "checking"} onClick={() => onUseVoucher(voucherCode)}>
          {voucherStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
        </Button>
      </div>
      {voucherStatus === "invalid" && <p className="text-xs text-destructive">Code invalide, expiré ou déjà utilisé</p>}
      <button onClick={() => { setShowVoucher(false); setVoucherCode(""); }} className="text-xs text-muted-foreground hover:text-foreground">Annuler</button>
    </div>
  );
}

// ─── Sub: Card grid ───
function CardGrid({ pricingCards, unitPrice, onBuyCard }: {
  pricingCards: PricingCard[]; unitPrice: number | null; onBuyCard: (card: PricingCard) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pricingCards.map(card => {
        const perSession = card.sessions < 9999 ? card.price / card.sessions : null;
        const savingsPercent = perSession && unitPrice ? Math.round((1 - perSession / unitPrice) * 100) : null;
        return (
          <div
            key={card.id}
            className={cn(
              "relative rounded-xl border-2 p-4 flex flex-col cursor-pointer transition-all hover:shadow-md",
              card.popular ? "border-primary bg-primary/5" : "hover:border-primary/40"
            )}
            onClick={() => onBuyCard(card)}
          >
            {card.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" /> Populaire
              </div>
            )}
            <h3 className="font-display font-semibold text-primary-dark">{card.name}</h3>
            <span className="text-2xl font-bold mt-1">{card.price}€</span>
            <p className="text-xs text-muted-foreground">{card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`} · {card.validity}</p>
            {perSession && (
              <p className="text-xs text-muted-foreground">
                {perSession.toFixed(2)}€ / cours
                {savingsPercent && savingsPercent > 0 && <span className="ml-1 text-primary font-semibold">-{savingsPercent}%</span>}
              </p>
            )}
            <Button size="sm" className={cn("mt-3", card.popular ? "bg-primary-dark text-primary-dark-foreground" : "")} variant={card.popular ? "default" : "outline"}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Choisir
            </Button>
          </div>
        );
      })}
    </div>
  );
}
