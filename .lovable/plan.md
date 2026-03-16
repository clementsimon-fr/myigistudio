# Plan: Fix Build Errors + Redesign Navigation & Layout

## Priority 1: Fix Build Errors (Radix UI Incompatibility)

The root cause is that all `@radix-ui/*` packages were upgraded to versions (e.g. `1.2.x`, `2.2.x`) that changed their TypeScript API — props like `className`, `children`, `asChild` are no longer in the type definitions. This breaks every shadcn/ui wrapper component.

**Fix**: Downgrade all `@radix-ui/*` packages in `package.json` to the last compatible versions (the ones that shipped with shadcn/ui). This affects ~20 packages. Example changes:

- `@radix-ui/react-accordion`: `1.2.11` → `1.2.2`
- `@radix-ui/react-alert-dialog`: `1.1.14` → `1.1.4`
- `@radix-ui/react-dialog`: `1.1.14` → `1.1.4`
- `@radix-ui/react-dropdown-menu`: (currently missing, needs adding) → `2.1.4`
- etc. for all Radix packages

This is the only way to restore the build — the shadcn wrapper code is correct, the packages are just too new.

---

## Priority 2: Feature Changes

### 2.1 — Visitor: No menu, just "Connexion" button

**Current**: Visitors see a hamburger menu on mobile that opens to show a "Connexion" button. On desktop, they see the button directly.

**Change in `Navbar.tsx**`: For visitors (`!isLoggedIn`), remove the hamburger menu button entirely on mobile. Show the "Connexion" button directly in the top bar on all screen sizes. The hamburger menu only appears for logged-in users.

### 2.2 — Redesign Discover page layout

**Current structure**:

```text
┌─ Navbar (logo + connexion) ─────────────┐
├─ Hero section (Bienvenue chez...) ───────┤
├─ ActivityFilterBar ──────────────────────┤
│  ├─ View tabs (Activités | Planning)     │
│  ├─ Category pills (Tout|Yoga|...)       │
│  └─ Sub-filters (if planning)            │
├─ Content (ActivitiesView/PlanningView) ──┤
└─ Footer ─────────────────────────────────┘
```

**New structure**:

```text
┌─ Navbar (logo left + connexion right) ──┐
├─ Navigation tabs ───────────────────────┤
│  Découvrir | Planning | Réserver | A propos
├─ Category filters ──────────────────────┤
│  Tout | Yoga | Poterie | Atelier
│  [▾ Afficher plus de filtres] (collapsible)
├─ Content ────────────────────────────────┤
└─ Footer ─────────────────────────────────┘
```

Changes:

- `**Discover.tsx**`: Remove the entire hero `<section>` block (lines 92-107)
- `**ActivityFilterBar.tsx**`: 
  - Rename VIEW_TABS: "Les activités" → "Découvrir", add "Réserver" and "A propos" tabs
  - "Réserver" navigates to `/reserver`, "A propos" scrolls to footer or a section
  - Move sub-filters into a collapsible section with `Collapsible` from shadcn, labeled "Afficher plus de filtres"
  - The collapsible is discreet: small text, chevron icon, collapsed by default

---

## Questions from an expert perspective

Before implementing, I have a few UX/architecture concerns:

1. **"Réserver" in the navigation tabs** — Currently, "Réserver" requires selecting a specific course first (it needs URL params like `?cours=Pilates&date=...`). If a visitor clicks "Réserver" from the nav without having selected a course, where should they land? Options:
  - Redirect to Planning view (so they pick a course first)
  - Show a page listing all upcoming bookable sessions
  - Show an error/prompt "Choisissez d'abord un cours"
  - Ma réponse : si un visiteur va directement dans Réserver, sans avoir cliqué dans découvrir)réserver, alors le visiteur voit tout 
2. **"A propos" in the navigation** — This is a new section. Should it scroll to a section on the same page, or link to a separate page? If it's a section, what content should it contain? Après réflexion, pas besoin de développer cette page.
3. **Removing the hero for all users** — The hero currently provides brand context for first-time visitors. Are you comfortable losing that, or would you prefer keeping a minimal one-line tagline (e.g., just "Yoga, Pilates, Poterie & Bien-être") without the large animated block? Ok pour minimal
4. **"Afficher plus de filtres" content** — Currently the sub-filters only show course names within a category (e.g., "Hatha Yoga", "Pilates" under Yoga). Should the collapsible also include other filter types (day of week, instructor, level)? Oui