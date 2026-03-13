

# Plan : MyIgiStudio - Frontend complet

## Identite visuelle (extraite du document)

Palette inspiree du branding IgiStudio :
- **Vert sauge** (#7BA68A) - couleur principale
- **Vert fonce** (#2D6A5A) - accents, titres
- **Peche/rose saumon** (#F2C9B8) - fonds doux
- **Jaune moutarde** (#E8B84B) - accents secondaires
- **Blanc casse** (#FDF8F4) - fond general
- **Gris fonce** (#3D3D3D) - texte

Typographie : police cursive pour les titres decoratifs, sans-serif propre pour le corps.

## Structure des pages

### 1. Pages publiques

**Page d'accueil** (`/`)
- Hero avec nom "MyIgiStudio" et bouton "Reserver"
- 3 categories en cards : Yoga & Pilates, Poterie, Ateliers
- Section tarifs (cartes de cours)
- Section intervenants

**Page Yoga & Pilates** (`/yoga`)
- Planning hebdomadaire (mardi a samedi)
- Liste des types de cours (Vinyasa, Pilates, Yin, Prenatal, Yang/Yin)
- Grille tarifaire des cartes (3, 5, 10, 20, 40 cours + unite + illimitee)
- Bouton "Reserver" (redirige vers login si non connecte)

**Page Poterie** (`/poterie`)
- 3 ateliers : Initiation tour, Stage tour & engobe, Peinture sur ceramique
- Prix, durees, places disponibles (donnees fictives)
- Prochaines dates

**Page Ateliers** (`/ateliers`)
- Liste des ateliers ponctuels : Qi Gong, Breathwork, Methode Wim Hof, Ceremonie Cacao
- Dates et prix

### 2. Espace client (donnees fictives)

**Connexion / Inscription** (`/login`, `/register`)
- Formulaires simples (email + mot de passe)
- Pas de backend pour l'instant, navigation simulee

**Mon espace** (`/mon-espace`)
- Tableau de bord : credits restants, prochaines reservations
- Mes reservations (liste avec statut)
- Mes cartes de cours (solde, expiration)
- Mes cartes cadeaux
- Historique des achats

**Reservation** (`/reserver`)
- Etape 1 : Choix du type de prestation
- Etape 2 : Calendrier avec creneaux disponibles
- Etape 3 : Pour qui ? (moi / plusieurs personnes)
- Etape 4 : Recapitulatif et confirmation (simulation)

### 3. Dashboard Admin Elodie

**Dashboard** (`/admin`)
- Vue d'ensemble : reservations du jour, taux de remplissage
- Sidebar avec navigation admin

**Gestion reservations** (`/admin/reservations`)
- Tableau filtrable par jour, service, client
- Statuts : confirme, annule, liste d'attente

**Gestion des cours** (`/admin/cours`)
- CRUD : creer, modifier, supprimer un cours
- Definir capacite, horaire, recurrence

**Gestion des clients** (`/admin/clients`)
- Liste des clients, credits restants, historique

**Gestion des ateliers** (`/admin/ateliers`)
- CRUD ateliers ponctuels (poterie, breathwork, etc.)

## Architecture technique

```text
src/
  pages/
    Index.tsx              -- Accueil
    Yoga.tsx               -- Page yoga
    Poterie.tsx            -- Page poterie
    Ateliers.tsx           -- Page ateliers
    Login.tsx              -- Connexion
    Register.tsx           -- Inscription
    MonEspace.tsx          -- Espace client
    Reserver.tsx           -- Parcours de reservation
    admin/
      Dashboard.tsx        -- Dashboard admin
      Reservations.tsx     -- Gestion reservations
      Cours.tsx            -- Gestion cours
      Clients.tsx          -- Gestion clients
      AteliersAdmin.tsx    -- Gestion ateliers
  components/
    layout/
      Navbar.tsx           -- Navigation principale
      Footer.tsx           -- Pied de page
      AdminSidebar.tsx     -- Sidebar admin
      AdminLayout.tsx      -- Layout admin avec sidebar
    home/
      HeroSection.tsx
      ServicesGrid.tsx
      PricingSection.tsx
      TeamSection.tsx
    booking/
      ServiceSelector.tsx
      CalendarView.tsx
      BookingSummary.tsx
    client/
      CreditCard.tsx
      ReservationList.tsx
    admin/
      ReservationTable.tsx
      CourseForm.tsx
      StatsCards.tsx
  data/
    mockData.ts            -- Toutes les donnees fictives
  lib/
    utils.ts
```

## Plan d'execution (par etapes)

Je recommande de proceder en **4 a 5 messages** :

1. **Theme + Layout + Accueil** : palette de couleurs, Navbar, Footer, page d'accueil complete
2. **Pages services** : Yoga, Poterie, Ateliers avec donnees fictives
3. **Espace client** : Login/Register (simules), Mon Espace, parcours de reservation
4. **Dashboard admin** : sidebar, dashboard, gestion reservations/cours/clients
5. **Polish** : responsive, animations, details visuels

Toutes les donnees seront fictives (mock data). Le backend (Supabase + Stripe) sera connecte dans une phase ulterieure.

