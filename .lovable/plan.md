1)Quand admin est connecté est va dans page visiteur, il doit voir dans son menu uniquement : Espace admin (oriente vers Bonjour) et Déconnexion 

2)Dans admin, activités et réservations, vue Plannings aujourd'hui, il n'est pas utile d'avoir les flèches pour changer de jour.

  
3) Plan : Corrections des flux de navigation et réservation

## Problèmes identifiés

### 1. Route `/?view=planning` non gérée

Le menu Navbar contient un lien "Planning" vers `/?view=planning`, mais `Discover.tsx` n'exploite pas ce paramètre. Résultat : cliquer sur "Planning" affiche la page d'accueil sans changement visible. Aussi utilisé dans `MonEspace.tsx` et `PricingSection.tsx`.

**Correction** : Dans `Discover.tsx`, lire le paramètre `view` et scroller automatiquement vers la première section planning inline (ou activer un mode dédié).

### 2. Console warning : `Function components cannot be given refs`

Les composants `Dialog` dans `ActivitiesView.tsx` et `PricingSection.tsx` reçoivent un ref qu'ils ne supportent pas. Probablement un artefact d'anciens usages.

**Correction** : Vérifier et supprimer tout ref invalide passé à `Dialog`.

### 3. Dates passées dans les workshops liés (linked_group)

Quand on accède à `/reserver?type=workshop&id=xxx`, les `linkedDates` ne sont pas filtrées pour exclure les dates passées. Un visiteur pourrait voir et réserver une date passée.

**Correction** : Dans `Reserver.tsx`, filtrer `linkedDates` et `linkedWorkshops` pour ne garder que les dates futures (lignes 374-391).

### 4. Workshop par ID sans date picker

Quand un workshop lié est réservé via `handleBookGroup` (clic "Réserver" sur une carte liée), il envoie directement `type=workshop&id=xxx&date=xxx` sans passer par le date picker. Incohérent avec la demande de toujours proposer le choix de date.

**Correction** : Pour les workshops liés avec plusieurs dates futures, afficher le date picker au lieu de pré-sélectionner la première date.

### 5. Lien "Planning" dans le menu pointe vers une vue inexistante

Le planning centralisé a été supprimé. Le lien devrait soit être retiré, soit pointer vers la page d'accueil avec un scroll vers les sections planning inline.

**Correction** : Changer le lien "Planning" dans `studioSections` pour scroller vers les sections inline, ou le supprimer du menu puisque le planning est maintenant directement visible.

## Fichiers impactés


| Fichier              | Action                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `Discover.tsx`       | Gérer `?view=planning` : scroll auto vers la première section planning                             |
| `Reserver.tsx`       | Filtrer les dates passées des linked workshops ; forcer date picker pour linked groups multi-dates |
| `ActivitiesView.tsx` | Corriger le ref warning sur Dialog                                                                 |
| `Navbar.tsx`         | Mettre à jour le lien Planning (ancre ou suppression)                                              |
| `PricingSection.tsx` | Corriger le ref warning sur Dialog                                                                 |
