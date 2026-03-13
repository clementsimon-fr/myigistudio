

## Plan d'ameliorations

Voici les 4 chantiers a realiser selon vos reponses :

### 1. Dashboard admin connecte aux vraies donnees
- Remplacer les imports `mockData` dans `Dashboard.tsx` par des requetes Supabase
- Stats en temps reel : reservations du jour (depuis `reservations`), nombre de clients uniques (distinct `client_name` depuis `reservations`), taux de remplissage (depuis `course_schedules` spots/spots_left), nombre de cours/ateliers cette semaine
- Tableau "Dernieres reservations" : les 10 plus recentes depuis `reservations`

### 2. Page Clients admin connectee aux reservations
- Remplacer `mockClients` dans `Clients.tsx` par une agregation depuis la table `reservations` (distinct `client_name`, nombre de reservations, date premiere reservation)
- Clic sur un client : dialog avec l'historique de ses reservations
- Pas de table `clients` dediee pour l'instant : on derive tout des reservations existantes

### 3. Systeme de cartes/credits en base de donnees
- **Migration SQL** : creer une table `client_cards` (`id`, `client_name`, `card_name`, `total_sessions`, `used_sessions`, `expires_at`, `created_at`)
- **Admin** : nouvelle section dans la page Clients ou page dediee pour attribuer/gerer les cartes (creer, modifier sessions utilisees, voir expiration)
- **MonEspace.tsx** : remplacer `mockClientCards` par les vraies cartes depuis `client_cards`
- **Reservation** : a la confirmation, incrementer `used_sessions` de la carte active du client (la plus ancienne non expiree avec des credits restants)

### 4. Page d'accueil & navigation
- **HeroSection.tsx** : changer le lien "Reserver un cours" de `/reserver` vers `/calendrier`, changer "Decouvrir le planning" de `/yoga` vers `/calendrier`
- Verifier la coherence des CTAs dans la navbar et le footer
- Nettoyage eventuel des imports `mockData` inutilises une fois les autres chantiers termines

### Ordre d'implementation
1. Migration `client_cards` (base necessaire pour le chantier 3)
2. Dashboard admin + Clients admin (chantier 1 & 2 en parallele)
3. Cartes/credits (MonEspace + logique reservation)
4. Page d'accueil & navigation

