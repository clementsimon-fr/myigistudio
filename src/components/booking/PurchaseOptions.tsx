import { useState, useRef, useEffect } from "react";
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
  category: string;
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
  const cardGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showFormulas && cardGridRef.current) {
      setTimeout(() => {
        cardGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showFormulas]);

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
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowFormulas(!showFormulas)}>
            <ShoppingCart className="h-4 w-4" /> Acheter carte yoga
          </Button>
          <VoucherButton showVoucher={showVoucher} setShowVoucher={setShowVoucher} voucherCode={voucherCode} setVoucherCode={setVoucherCode} onUseVoucher={onUseVoucher} voucherStatus={voucherStatus} onVoucherCodeChange={onVoucherCodeChange} />
        </div>

        {showFormulas && (
          <div ref={cardGridRef}>
            <CardGrid pricingCards={pricingCards} unitPrice={unitPrice} onBuyCard={onBuyCard} />
          </div>
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
            {userName}, les cours de yoga et pilates fonctionnent avec l'achat de cartes yoga. Achetez une carte pour réserver.
          </p>
        </div>

        <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowFormulas(!showFormulas)}>
          <ShoppingCart className="h-4 w-4" /> {showFormulas ? "Masquer les formules" : "Acheter une carte Yoga"}
        </Button>

        {showFormulas && (
          <div ref={cardGridRef}>
            <CardGrid pricingCards={pricingCards} unitPrice={unitPrice} onBuyCard={onBuyCard} />
          </div>
        )}

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
            <Eye className="h-4 w-4" /> Voir les formules carte yoga
          </Button>
        </div>

        <FormulaInfoModal
          open={showFormulas}
          onClose={() => setShowFormulas(false)}
          onCreateAccount={onCreateAccount}
          onContinueWithout={() => setShowFormulas(false)}
          pricingCards={pricingCards}
          unitPrice={unitPrice || undefined}
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

// ─── Sub: Card grid (revamped formulas) ───
function CardGrid({ pricingCards, unitPrice, onBuyCard }: {
  pricingCards: PricingCard[]; unitPrice: number | null; onBuyCard: (card: PricingCard) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const unitCards = pricingCards.filter(c => c.sessions === 1);
  const multiCards = pricingCards.filter(c => c.sessions > 1);

  const handleCardClick = (card: PricingCard) => {
    onBuyCard(card);
    // Scroll to bottom of grid after click
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Vous pouvez acheter un cours à l'unité ou acheter plusieurs cartes de yoga utilisables quand vous le souhaitez pendant la durée de validité.
      </p>

      {/* Unit card(s) with green background */}
      {unitCards.map(card => (
        <div
          key={card.id}
          className="relative rounded-xl border-2 p-4 flex flex-col cursor-pointer transition-all hover:shadow-md bg-emerald-50/60 border-emerald-200"
          onClick={() => handleCardClick(card)}
        >
          <h3 className="font-display font-semibold text-foreground">Carte Yoga à l'unité</h3>
          <span className="text-2xl font-bold mt-1">{card.price}€</span>
          <p className="text-xs text-muted-foreground">1 cours · {card.validity}</p>
          <Button size="sm" variant="outline" className="mt-3">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Choisir
          </Button>
        </div>
      ))}

      {/* Separator */}
      {multiCards.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm font-display font-semibold text-muted-foreground">Ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Multi-session cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {multiCards.map(card => {
          const perSession = card.sessions < 9999 ? card.price / card.sessions : null;
          return (
            <div
              key={card.id}
              className={cn(
                "relative rounded-xl border-2 p-4 flex flex-col cursor-pointer transition-all hover:shadow-md",
                card.popular ? "border-primary bg-primary/5" : "hover:border-primary/40"
              )}
              onClick={() => handleCardClick(card)}
            >
              {card.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" /> Populaire
                </div>
              )}
              <h3 className="font-display font-semibold text-primary-dark">Cartes Yoga "{card.name}"</h3>
              <span className="text-2xl font-bold mt-1">{card.price}€</span>
              <p className="text-xs text-muted-foreground">{card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`} · {card.validity}</p>
              {perSession && (
                <p className="text-xs text-muted-foreground">
                  {perSession.toFixed(2)}€ / cours
                </p>
              )}
              <Button size="sm" className={cn("mt-3", card.popular ? "bg-primary-dark text-primary-dark-foreground" : "")} variant={card.popular ? "default" : "outline"}>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Choisir
              </Button>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}