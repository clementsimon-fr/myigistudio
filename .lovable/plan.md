

# Éléments restants à implémenter

Voici ce qui n'a pas encore été traité dans la précédente implémentation :

## 4. Admin — Calendrier des activités (4.2, 4.3, 4.4)

**`src/components/admin/ActivityCalendar.tsx`** :
- **4.2** : Le badge "Cours" / "Récurrent" / "Atelier" / "Planifié" (ligne 331) apparaît dans chaque bloc → le supprimer
- **4.3** : Refonte du `renderSessionBlock` :
  - Titre activité (inchangé)
  - Heure + nom de l'intervenant (récupérer depuis `courses`/`workshops` via `instructor` field) sur la même ligne
  - Petit trait de séparation (`<Separator />`)
  - Badge fond blanc avec nombre de participants (récupérer depuis `reservations` count ou `spots - spots_left`)
  - Liste des inscrits (noms des réservations pour ce créneau)
  - Supprimer la barre de couleur de progression
- **4.4** : Au clic sur un bloc, le popup actuel doit :
  - Afficher le badge catégorie avec la bonne couleur (yoga=bleu, poterie=jaune, bien-etre=rouge)
  - Supprimer le badge "Cours"
  - Ajouter un bouton "Éditer" (icône crayon) qui ouvre le dialog d'édition d'activité existant (`Activites.tsx`)

Pour 4.3/4.4, il faut passer les données `reservations`, `courses` (avec instructor) en props ou les fetch dans le composant.

## 5. Admin — Planning type mobile (5.1)

**`src/pages/admin/PlanningType.tsx`** :
- La table déborde sur mobile car les colonnes jour ont une largeur fixe (`w-12`/`w-14`)
- Ajouter `min-w-0` sur le conteneur et `overflow-x-auto` (déjà présent mais insuffisant)
- Réduire les en-têtes à 1-2 lettres sur mobile (`L`, `M`, `M`, `J`, `V`, `S`, `D`)
- Ajouter une classe `min-w-[600px]` à la table pour forcer le scroll horizontal propre

## 6. Admin — Notifications (6.3, 6.4, 6.5)

**`src/pages/admin/Dashboard.tsx`** :
- **6.3** : Ajouter une section "Achats Yoga" qui fetch `client_cards` et affiche les achats récents de cartes yoga (card_name, client_name, created_at)
- **6.4** : Ajouter des filtres :
  - Par activité (badges cliquables basés sur les `activity_name` distincts des réservations)
  - Vues temporelles : "Générale" (tout), "Aujourd'hui" (date = today), "Semaine" (7 derniers jours)
  - Appliquer les filtres aux deux tableaux Inscriptions et Achats Yoga
- **6.5** : Responsive mobile — ajouter `overflow-x-auto` aux tables, masquer les colonnes secondaires (Date, Heure) sur mobile avec `hidden sm:table-cell`

## 8. Admin — Clients (8.1-8.6, 8.8, 8.9)

**`src/pages/admin/Clients.tsx`** :
- **8.1** : Le `loadClients` agrège déjà les clients sans compte (via reservations). C'est déjà fonctionnel — les clients sans profil apparaissent. Vérifier que c'est bien le cas.
- **8.2** : Ajouter des filtres "Avec compte" / "Sans compte" (basé sur `profileId` présent ou non)
- **8.3** : Ajouter colonne "Profil" dans le tableau : badge "Compte" (si profileId) ou "Sans compte"
- **8.4** : Ajouter colonne "Yoga" affichant le nombre de cartes disponibles (fetch `client_cards` et calculer `total_sessions - used_sessions` par client)
- **8.5** : Ajouter filtres activité (badges cliquables par activité distincte trouvée dans les prestations)
- **8.6** : Retirer le bouton corbeille de la liste principale, le déplacer dans le dialog détail client. Ajouter un `AlertDialog` de confirmation avant suppression.
- **8.8** : Dans le dialog détail client, rendre les champs directement éditables (inline edit) au lieu du bouton crayon séparé. Afficher les champs en mode édition directement.
- **8.9** : Ajouter un bloc stats en haut : "X clients total", "Y avec compte", "Z sans compte"

## 9. Admin — Tarifs Yoga (9.2)

**`src/pages/admin/Tarifs.tsx`** :
- Déplacer le bouton corbeille dans l'éditeur (dialog d'édition) au lieu de la liste
- Ajouter un `AlertDialog` de confirmation de suppression

## 10. Admin — Bons cadeaux (10.1, 10.2)

**`src/pages/admin/BonsCadeaux.tsx`** :
- **10.1** : Responsive mobile — ajouter `overflow-x-auto`, masquer colonnes secondaires sur mobile, ajuster les largeurs
- **10.2** : Pour les champs "Acheteur" et "Bénéficiaire", remplacer les inputs texte par des `Select` avec liste déroulante des clients connus (fetch profiles + noms des réservations), avec option de saisie libre

## 11. Admin — Contrat (11.1)

**`src/pages/admin/Contrat.tsx`** :
- Responsive mobile — ajouter `overflow-x-auto` et ajuster les Cards/grids pour ne pas déborder (stack vertical sur mobile, réduire les paddings)

## Fichiers modifiés

| Fichier | Changements |
|---------|------------|
| `ActivityCalendar.tsx` | Refonte blocs (intervenant, participants, inscrits), popup avec badge couleur + bouton éditer, suppression badge "Cours" |
| `PlanningType.tsx` | Fix responsive mobile (min-width table, headers courts) |
| `Dashboard.tsx` | Section "Achats Yoga", filtres activité + temporels, fix responsive |
| `Clients.tsx` | Filtres compte/activité, colonnes Profil + Yoga, stats, corbeille dans dialog, édition inline |
| `Tarifs.tsx` | Corbeille dans dialog + confirmation |
| `BonsCadeaux.tsx` | Fix responsive, Select clients pour acheteur/bénéficiaire |
| `Contrat.tsx` | Fix responsive mobile |

