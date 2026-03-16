

# Plan: Navigation Rename + Planning Type Feature

## 1. Rename "Planning" → "Réserver" and remove old "Réserver" tab

**`ActivityFilterBar.tsx`**: Change NAV_TABS from `["Découvrir", "Planning", "Réserver"]` to `["Découvrir", "Réserver"]`. "Réserver" now switches to the planning view (value `"planning"`), not a `/reserver` redirect. Remove the old "Réserver" navigation entry.

**`Discover.tsx`**: No structural change needed -- the `view === "planning"` still renders `PlanningView`. The URL param `?view=planning` becomes `?view=reserver` for clarity (optional, or keep as-is internally).

**Buttons size**: Increase nav button size from `h-8 text-xs px-3` to `h-10 text-sm px-5`.

## 2. Bigger navigation buttons

In `ActivityFilterBar.tsx`, increase the nav buttons: `h-8 text-xs` → `h-10 text-sm px-5`.

## 3. "Planning Type" feature

### Concept understood
The data already exists: each course has `course_schedules` entries with a `day` field (Lundi, Mardi...). Workshops have a `date` field but also a `frequency` field. The "planning type" is a **read-only, auto-generated weekly overview** derived from existing activity schedules.

### 3a. Admin: New "Planning type" page

- Add route `/admin/planning-type` and sidebar entry under "Organisation" (icon: `CalendarRange`).
- The page fetches courses + course_schedules + workshops and displays a **weekly grid**: columns = 7 days (Lun-Dim), rows = activities/sub-activities, with colored dots (category color) where an activity occurs on that day.
- Read-only, auto-populated from existing data. No manual editing.

### 3b. Visitor: "Fréquence" button on activity cards

- In `ActivitiesView.tsx`, add a "Fréquence" button next to "Description" on each course/workshop card.
- Clicking opens a `Dialog` showing a **weekly frequency table**:
  - Header row: Lun | Mar | Mer | Jeu | Ven | Sam | Dim
  - One row per activity/sub-activity in the same category
  - Colored crosses (✕) where the activity has a scheduled day
- This reuses the same data: `course_schedules.day` for courses, and for workshops with `frequency === "hebdomadaire"`, the day is extracted from the `date` field.

### 3c. Description dialog enhancement

- In the existing Description dialog (for courses), add the weekly frequency row showing which days this specific activity occurs, as a simple inline visual (7 small circles, filled on active days).

### Data source
- Courses: `course_schedules` table has `day` column (e.g., "Lundi", "Mercredi")
- Workshops: `workshops` table has `date` (specific date) and `frequency` (ponctuel/hebdomadaire). For recurring workshops, extract the day-of-week from the date.

---

## Files to modify/create

| File | Change |
|------|--------|
| `src/components/ActivityFilterBar.tsx` | Rename tabs, increase button size |
| `src/components/ActivitiesView.tsx` | Add "Fréquence" button + dialog with weekly grid |
| `src/pages/admin/PlanningType.tsx` | **New** -- admin page showing auto-generated weekly overview |
| `src/components/admin/AdminSidebar.tsx` | Add "Planning type" menu entry |
| `src/App.tsx` | Add `/admin/planning-type` route |

## Expert question

Pour la fonctionnalité "Fréquence" sur la page visiteur : le bouton "Fréquence" doit-il apparaître sur chaque carte individuelle (montrant uniquement les jours de cette activité), ou un seul bouton global qui affiche le tableau complet de toutes les activités ? Je pars sur **un bouton par carte** qui ouvre un popup montrant le tableau complet de la catégorie (toutes les activités yoga si on clique depuis une carte yoga), ce qui donne du contexte au visiteur. Est-ce bien ce que vous souhaitez ?

