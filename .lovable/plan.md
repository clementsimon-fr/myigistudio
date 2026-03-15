

## Proposition A — Compacter la barre de filtres sur 2 lignes

### Changements sur `src/components/ActivityFilterBar.tsx`

**Ligne 1 — Onglets compacts :**
- Réduire les paddings des boutons tabs : `px-3` au lieu de `px-5`, `text-xs` au lieu de `text-sm`, hauteur `h-8`
- Padding vertical minimal : `pt-1.5 pb-1`

**Ligne 2 — Pills catégories :**
- Supprimer le label "Filtre" (redondant, les pills parlent d'elles-mêmes)
- Réduire les pills : `h-6 text-[11px] px-2` au lieu de `h-7 text-xs`
- Réduire le dot à `w-1.5 h-1.5`
- Padding : `pb-1.5 pt-0.5`

**Résultat estimé :** passage de ~120px de hauteur sticky à ~60px, libérant environ 50% de viewport en plus pour le contenu.

