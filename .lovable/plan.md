

## Plan: Confirmation de suppression + Vue calendrier pour les ateliers

### 1. Confirmation de suppression

Ajouter un `AlertDialog` de confirmation avant chaque suppression (cours et ateliers). Au clic sur l'icone poubelle, un dialog "Confirmer la suppression ?" apparait avec les boutons "Annuler" et "Supprimer".

**Fichier modifie** : `src/pages/admin/Activites.tsx`
- Importer `AlertDialog` depuis `@/components/ui/alert-dialog`
- Ajouter un state `deletingItem` pour stocker l'id et le type (course/workshop) de l'element a supprimer
- Remplacer les appels directs `deleteCourse(id)` / `onDelete(id)` par l'ouverture de l'AlertDialog
- Sur confirmation, executer la suppression reelle

### 2. Vue calendrier pour planifier les activites

L'idee : Elodie gere deux choses distinctes :
- **Activites recurrentes** (tab liste actuel) : les cours fixes de la semaine, deja en place
- **Seances planifiees** (nouvelle vue calendrier) : des occurrences ponctuelles ou elle place une activite existante a une date/heure precise

**Schema de donnees** : Nouvelle table `planned_sessions` via migration :

```text
planned_sessions
├── id (uuid, PK)
├── course_id (uuid, FK → courses, nullable)
├── workshop_id (uuid, FK → workshops, nullable)
├── title (text) — nom libre si pas lie a une activite existante
├── date (date)
├── time (text)
├── end_time (text)
├── notes (text)
├── created_at (timestamptz)
```

RLS : acces public (comme les autres tables, pas d'auth pour le moment).

**UX dans l'admin** : Ajouter un sous-onglet ou un toggle "Liste / Calendrier" dans chaque tab (ou au niveau global). La vue calendrier :
- Affiche un calendrier mensuel (composant `Calendar` existant ou grille custom)
- Chaque jour montre les seances planifiees sous forme de pastilles/badges
- Clic sur un jour ouvre un dialog pour ajouter une seance : choix d'une activite existante (select parmi cours/ateliers) ou saisie libre, heure debut/fin
- Les seances recurrentes (hebdomadaires) sont automatiquement projetees sur le calendrier en lecture seule
- Les seances manuelles sont editables/supprimables

**Fichiers modifies/crees** :
- Migration SQL pour `planned_sessions`
- `src/pages/admin/Activites.tsx` : ajouter toggle Liste/Calendrier, integrer le composant calendrier
- `src/components/admin/ActivityCalendar.tsx` (nouveau) : composant calendrier mensuel avec navigation mois precedent/suivant, affichage des seances par jour, dialog d'ajout/edition

### Details techniques

- Le calendrier genere les jours du mois en cours, avec navigation avant/arriere
- Les cours recurrents hebdomadaires sont projetes automatiquement : pour chaque `course_schedule`, on calcule les dates correspondantes dans le mois affiche
- Les `planned_sessions` sont fetchees depuis la BDD pour le mois visible
- Le dialog d'ajout permet de selectionner une activite existante (pre-remplissant le titre et les horaires) ou de saisir manuellement

