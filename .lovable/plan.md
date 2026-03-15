

## Diagnostic

Le problème vient du `variant="ghost"` utilisé pour les boutons actifs. Ce variant applique `hover:bg-accent hover:text-accent-foreground` en Tailwind. Sur mobile, l'état hover se déclenche au tap, et `hover:bg-accent` (qui est vert/sage dans le thème) écrase visuellement la couleur dynamique `bg-[hsl(...)]`. C'est pour ça que Poterie "redevient verte" après un changement de catégorie.

## Corrections

### 1. Fichier `src/components/ActivityFilterBar.tsx` — Category pills

Remplacer `variant="ghost"` par `variant={null}` (pas de styles de variant) pour les boutons actifs, et ajouter explicitement les classes hover correspondant à la catégorie pour éviter tout conflit :

- Actif avec `activeBg` : `${f.activeBg} text-white border-transparent hover:${f.activeBg} hover:text-white hover:opacity-90`
- Actif sans `activeBg` ("Toutes") : `bg-primary-dark text-white border-transparent hover:bg-primary-dark/90 hover:text-white`
- Inactif : garder `variant="outline"` tel quel

### 2. Fichier `src/components/PlanningView.tsx` — Sub-filters

Même correction pour les sous-filtres (lignes 275-286) : remplacer `variant="ghost"` par `variant={null}` pour les boutons actifs et ajouter les hover classes dynamiques correspondant à la catégorie parente.

### Impact

Deux fichiers modifiés. Les couleurs resteront cohérentes peu importe l'ordre de navigation entre catégories.

