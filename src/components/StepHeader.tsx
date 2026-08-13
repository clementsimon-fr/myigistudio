// En-tête numéroté partagé par les popups pédagogiques (testeurs + admin) — matérialise
// visuellement une séquence d'étapes à suivre dans l'ordre, pas des blocs d'info indépendants.
export default function StepHeader({ n, icon: Icon, title }: { n: number; icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-dark text-primary-dark-foreground text-xs font-bold shrink-0">
        {n}
      </span>
      <Icon className="h-4 w-4 text-primary-dark shrink-0" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}
