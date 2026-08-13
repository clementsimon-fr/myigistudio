interface ClientLayoutProps {
  children: React.ReactNode;
  title: string;
}

// Déconnexion volontairement absente d'ici (en-tête) : sur mobile, elle doit toujours être tout
// en bas de l'écran, jamais en haut — voir le bloc dédié en pied de page dans MonEspace.tsx.
// "Faire une réservation" a aussi été retiré d'ici : il vit maintenant sous le titre "Mes
// réservations" dans le contenu de la page, pas dans une barre sticky globale.
// Le prénom du client ("Bonjour {prénom}") est affiché dans le bloc d'accueil de MonEspace,
// pas ici — l'en-tête reste générique ("Espace client") quelle que soit la page.
export default function ClientLayout({ children, title }: ClientLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex h-14 items-center">
          <h1 className="text-lg font-display font-bold text-primary-dark">
            Espace client
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
