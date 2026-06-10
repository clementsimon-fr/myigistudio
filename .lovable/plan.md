# Plan — Refonte admin (Partie 1) + Vérif bons cadeaux (Partie 2)

## Partie 1 — Admin

### 1. Menu ORGANISATION renommé et scindé
`AdminSidebar.tsx` : remplacer l'unique entrée "Activités et réservations" par deux entrées :
- **Fiches activités** → `/admin/activites` (édition des fiches d'activité uniquement : description, tarif, intervenant, inclusions…)
- **Planning** → `/admin/planning` (vues Jour / Semaine / Mois + bouton "Ajouter un événement")

Techniquement, `Activites.tsx` aujourd'hui mélange les deux. Je vais :
- Conserver `/admin/activites` mais **n'y garder que la liste des fiches activités** (cards + drawer d'édition).
- Créer une nouvelle page `Planning.tsx` montée sur `/admin/planning` qui contient le calendrier (Jour/Semaine/Mois) + le bouton "Ajouter un événement". Tout le code calendrier déjà présent y est déplacé tel quel.

### 2. Dialog "Ajouter un événement"
`AddEventMetaDialog.tsx` : retirer la saisie **Prix (€)** et **Carte(s) yoga** du bloc Configuration. Ces valeurs viennent automatiquement de la fiche activité (`default_price`, `default_card_yoga_count`) — déjà préchargées, mais on rend les champs invisibles et on garde la valeur en state. Le commentaire d'aide précise "Le tarif est défini sur la fiche activité".

### 3. Fiche activité (drawer d'édition)
Dans `Activites.tsx`, à l'ouverture d'une fiche :
- **Supprimer la rubrique "Événement / Détailler l'événement"** (déjà nettoyée en Lot B mais il reste des vestiges, je passe une dernière passe).
- **Déplacer le bloc "Tarif & inclusions"** hors de la rubrique Description, dans une **nouvelle rubrique dédiée "Tarif & inclusions"** affichée juste après Description.

### 4. Suppression définitive de "Bien-être"
Dans tous les fichiers listés (`src/pages/Reserver.tsx`, `src/data/mockData.ts`, `Reservations.tsx`, `Intervenants.tsx`, `Bonjour.tsx`, `Contenu.tsx`, `Activites.tsx`, `AteliersAdmin.tsx`, `ActivityCalendar.tsx`, `TestUX*.tsx`) :
- Retirer toute entrée de catégorie/filtre `bien-etre` / `Bien-être` / `bien_etre`.
- Remplacer toute donnée mock catégorisée Bien-être par Yoga, Pilates ou Poterie (selon le contexte).
- Les pages `TestUX*` sont des bacs à sable expérimentaux — je nettoie aussi pour éviter la confusion en démo.

### 5. Sync tarifs Yoga
Sur `/admin/tarifs`, la modification d'une carte ne se propage pas. Investigation :
- Vérifier que `pricing_cards` est la source de vérité.
- Repérer les composants qui affichent les tarifs (page d'accueil `PricingSection`, tunnel de réservation `PurchaseOptions`, espace client `Cartes Yoga`).
- S'assurer qu'ils lisent bien `pricing_cards` (et pas du data en dur). Si du data en dur subsiste, brancher sur le hook approprié.

### 6. Grisé : Contrat / Fonctionnalités / Paramètres
`AdminSidebar.tsx` — rubrique "Mon application" : afficher ces trois liens en `text-muted-foreground/50`, `cursor-not-allowed`, `pointer-events-none`, et retirer le `NavLink` (remplacé par un `div` non cliquable). Le label reste visible mais inactif.

## Partie 2 — Vérif bons cadeaux

Lecture seule + correctifs ponctuels si nécessaire. Je vérifie ces 3 chaînes :

**Côté admin (`/admin/bons-cadeaux`)** : Elodie peut créer/supprimer/désactiver un bon cadeau (montant, code, bénéficiaire, validité).

**Côté tunnel de réservation (`Reserver.tsx` + `PaymentSummary.tsx`)** : un client peut saisir un code bon cadeau, le montant est défalqué du total, le bon est marqué consommé.

**Côté espace client (`MonEspace.tsx`)** : si le client est destinataire d'un bon, il le voit dans son espace ("Mes bons cadeaux") avec son solde restant.

Pour chaque maillon je liste : ✅ fonctionne, ⚠️ à corriger (avec patch minimal), ❌ manquant (à signaler — pas implémenté dans ce lot sauf demande explicite).

## Détails techniques

- Routes : ajouter `<Route path="/admin/planning" element={<Planning />} />` dans `App.tsx`. Garder `/admin/activites` pour la page Fiches.
- `Planning.tsx` réutilise `ActivityCalendar` + `DailyView` + `AddEventMetaDialog` (déjà extraits). Aucune migration DB.
- Pas de migration SQL nécessaire pour cette itération.
- Sidebar : 3 items grisés = non navigables, mais visibles pour rappeler qu'ils existent (selon ton wording "grisé et impossible à cliquer").

## Hors scope (à confirmer si tu veux qu'on les fasse aussi)

- Import Excel clients (Lot C) — toujours en attente.
- Refonte complète des pages `TestUX*` au-delà du nettoyage Bien-être.
