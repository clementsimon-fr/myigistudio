

## Plan

### 1. Page Yoga : meme UX que Poterie/Ateliers

La page Yoga utilise deja des fiches activites avec rollup de creneaux, boutons Description/Reserver. La difference principale avec Poterie/Ateliers est l'absence d'image sur les fiches de cours.

**Changements :**
- **Migration SQL** : ajouter une colonne `image text NOT NULL DEFAULT ''` a la table `courses`
- **Yoga.tsx** : ajouter le bloc image `aspect-[4/3]` au-dessus du contenu de chaque fiche, identique au format Poterie
- **Admin Activites.tsx** : ajouter un champ "URL image" dans le formulaire de creation/edition des cours

### 2. Photos des intervenants

**Changements :**
- **Migration SQL** : ajouter une colonne `photo_url text NOT NULL DEFAULT ''` a la table `instructors`
- **Storage** : creer un bucket `instructor-photos` (public) pour l'upload
- **Admin Intervenants.tsx** : remplacer l'avatar generique par un composant d'upload photo (input file → upload vers le bucket → stocker l'URL dans `photo_url`)
- **Affichage** : dans les fiches intervenants admin et la section Equipe du site (TeamSection.tsx), afficher la vraie photo

### 3. Etude : modification du contenu du site depuis l'admin

Actuellement, le contenu textuel du site est code en dur dans les composants (HeroSection, ServicesGrid, TeamSection, pages Yoga/Poterie/Ateliers headers). La table `site_settings` existe deja (cle/valeur) et sert pour les notes de tarification.

**Approche proposee : etendre `site_settings` en mini-CMS**

Chaque section editable du site serait stockee comme une entree dans `site_settings` avec une cle structuree (ex: `hero_title`, `hero_subtitle`, `yoga_page_title`, `yoga_page_subtitle`, `services_title`, `team_title`...).

**Cote admin :**
- Nouvelle page `/admin/contenu` (ou section dans le dashboard) avec un formulaire organise par page/section
- Champs texte et textarea pour chaque contenu editable
- Sauvegarde vers `site_settings`

**Cote site :**
- Les composants (HeroSection, ServicesGrid, etc.) chargent leurs textes depuis `site_settings` avec un fallback vers les valeurs par defaut codees en dur
- Un hook `useSiteSettings()` centralise le chargement et le cache

**Ce qui serait editable :**
- Titres et sous-titres de chaque page (accueil, yoga, poterie, ateliers)
- Texte du hero (accueil)
- Descriptions des services (ServicesGrid)
- Section "Infos Pratiques" (page Yoga)
- Bio et infos equipe (deja via instructors)

**Ce qui reste code :** la structure HTML/CSS, les logos, la navigation.

### Ordre d'implementation

1. Migration SQL (image courses + photo_url instructors + bucket storage)
2. Mise a jour Yoga.tsx + admin Activites formulaire image
3. Upload photo intervenants (admin + affichage)
4. Mini-CMS : hook `useSiteSettings`, page admin `/admin/contenu`, mise a jour des composants du site

