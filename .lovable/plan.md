# Plan — Améliorations cohérence & UX

## 1) Tarif activité + Formules Cartes Yoga centralisé

- Dans `ActivityDetailPanel`, mettre à jour le bloc Tarif pour afficher exactement : **`X € ou 1 carte Yoga`** (au lieu de `1 carte (X€)`).
- Extraire le contenu de `FormulaInfoModal` dans un composant réutilisable `YogaFormulasBlock` (présentation seule, basée sur `pricing_cards`) :
  - Titre `✨ Formules Cartes Yoga` + intro
  - Carte unitaire (fond vert) + séparateur "Ou" + cartes multiples
  - **Ajout** : badge « -X% » calculé vs prix unitaire (`(1 - (price/sessions)/unitPrice) * 100`, arrondi)
- `FormulaInfoModal` consomme ce composant (zéro régression).
- Brancher `YogaFormulasBlock` dans `ActivityDetailPanel` pour les cours yoga : section visible juste sous le bloc Tarif/grille (replie l'ancien lien "Découvrir formules" s'il existe).
- Tout futur usage du libellé "Formules Cartes Yoga" passera par ce composant.

## 2) Admin Contenu → page "Boutons"

- Nouvelle table `home_buttons` :
  - `key` (yoga | poterie | decouvrir) unique
  - `title` (texte affiché)
  - `icon_url` (image dans bucket `activity-images`)
  - `sort_order`
- Seed des 3 lignes par défaut.
- Page admin `/admin/boutons` (CRUD : modifier titre + uploader logo) sous le menu Contenu de la sidebar.
- `ActivityFilterBar` lit les titres/icônes depuis cette table (fallback sur les valeurs actuelles).

## 3) Déplacement "Évènements" dans Contenu

- Dans `AdminSidebar`, déplacer l'entrée Évènements dans le groupe Contenu (à côté de Découvrir / Boutons / Tarifs / etc.). Route inchangée.

## 4) Comptes démo : masquer Marion & Sophie par défaut

- Dans `DemoContext`, distinguer les profils « seed » des profils créés via `signup`.
- Sur l'écran Login (`Choisir un compte pour la démo`), n'afficher que les profils créés par l'utilisateur (stockés dans `LS_TEMP_PROFILES_KEY`).
- Si la liste est vide → masquer le bloc + message "Aucun compte créé pour la démo".

## 5) Popup post-création de compte

- Après `signup` réussi (page Register / bloc Signup du tunnel), afficher un Dialog avec 2 boutons :
  - **Continuer votre réservation** → revient au tunnel si une réservation est en cours, sinon vers `/reserver`.
  - **Découvrir votre espace client** → `/mon-espace`.
- Détection « réservation en cours » : présence d'un brouillon dans le state du tunnel ou query param `from=reserver`.

## 6) Amélioration espace client

Refonte de `MonEspace` pour densifier :
- **Header de bienvenue** compact (avatar + prénom + raccourcis : Réserver / Acheter carte / Bon cadeau).
- **3 cartes synthèse** en haut : Cartes Yoga restantes, Prochaine réservation, Bon cadeau actif.
- **Onglets** : Réservations (à venir / historique), Mes cartes & achats, Bons cadeaux, Profil.
- Section **Activité récente** (5 derniers événements : réservations, achats).
- Bandeau **Contacter Elodie** en bas (réutilise `ContactElodieButton`).

## Détails techniques

- Nouveau composant : `src/components/YogaFormulasBlock.tsx` consommé par `FormulaInfoModal` et `ActivityDetailPanel`.
- Migration SQL : table `home_buttons` (key text PK, title text, icon_url text, sort_order int, timestamps) + GRANT authenticated/service_role + GRANT SELECT anon (lecture publique) + RLS (admin write via `has_role`).
- Nouvelle page `src/pages/admin/Boutons.tsx` + route `/admin/boutons` + lien sidebar dans le groupe Contenu.
- `AdminSidebar` : déplacer `Événements` sous Contenu.
- `DemoContext` : exposer `userCreatedProfiles` distinct des seeds.
- `Register.tsx` + `SignupBlock.tsx` : Dialog `PostSignupChoice`.
- `MonEspace.tsx` : restructuration UI uniquement.

Aucun changement de logique métier sur réservations, paiements, ou auth.
