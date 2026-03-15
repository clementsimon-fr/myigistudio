

## Proposition : Option 1 — Couleurs dynamiques par catégorie

L'Option 1 est clairement la meilleure car elle renforce l'identité visuelle de chaque catégorie et crée une cohérence entre le filtre actif et les sous-filtres/cartes. L'Option 2 (tout en noir) perdrait cette distinction visuelle qui aide l'utilisateur à s'orienter.

### Couleurs proposées

| Catégorie | Actuel | Nouveau |
|-----------|--------|---------|
| Yoga & Pilates | Vert sauge `hsl(148,18%,56%)` | Bleu doux `hsl(210,60%,55%)` |
| Poterie | Jaune moutarde `hsl(40,76%,60%)` | Jaune moutarde (inchangé) |
| Ateliers | Orange `hsl(18,68%,54%)` | Rouge doux `hsl(0,55%,58%)` |

### Changements dans `ActivityFilterBar.tsx`

**Pills catégories** — quand un filtre est actif, le bouton prend la couleur de sa catégorie :
- Yoga actif → `bg-[hsl(210,60%,55%)] text-white`
- Poterie actif → `bg-[hsl(40,76%,60%)] text-white`
- Ateliers actif → `bg-[hsl(0,55%,58%)] text-white`
- "Toutes" actif → reste en `bg-primary-dark` (vert foncé actuel)
- Inactif → reste en `variant="outline"`

**Dots et `CATEGORY_STYLES`** — mettre à jour les couleurs de dots et blocs :
- `yoga.dot` → `bg-[hsl(210,60%,55%)]`, `yoga.block` → `bg-[hsl(210,60%,55%)]/10 border-[hsl(210,60%,55%)]/30`
- `bien-etre.dot` → `bg-[hsl(0,55%,58%)]`, `bien-etre.block` → `bg-[hsl(0,55%,58%)]/10 border-[hsl(0,55%,58%)]/30`

### Fichiers impactés

1. **`src/components/ActivityFilterBar.tsx`** — Modifier `CATEGORY_FILTERS` (dots), `CATEGORY_STYLES` (blocks/dots), et la logique de rendu des pills pour appliquer la couleur de fond dynamique quand actif
2. **`src/index.css`** — Aucun changement (on utilise des couleurs inline)

Les composants `PlanningView.tsx` et `DailyView.tsx` importent `CATEGORY_STYLES` donc ils hériteront automatiquement des nouvelles couleurs.

