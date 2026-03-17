interface BookingSummaryProps {
  activityName: string;
  date: Date;
  time: string;
  endTime: string;
  duration: string;
  price?: number;
  category?: string;
}

export default function BookingSummary({ activityName, date, time, endTime, duration, price, category }: BookingSummaryProps) {
  return (
    <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Résumé de la réservation</p>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Activité</span>
        <span className="font-medium">{activityName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Date</span>
        <span className="font-medium">{date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Horaire</span>
        <span className="font-medium">{time} - {endTime}</span>
      </div>
      {duration && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Durée</span>
          <span className="font-medium">{duration}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Lieu</span>
        <span className="font-medium">Studio MyIgi</span>
      </div>
      {price != null && (
        <div className="flex justify-between border-t pt-2 mt-1">
          <span className="text-muted-foreground">Prix unitaire</span>
          <span className="font-semibold text-primary-dark">{price} €</span>
        </div>
      )}
    </div>
  );
}
