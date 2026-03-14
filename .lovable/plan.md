

## Grille tarifaire et système de tickets intelligents

### Le probleme

Elodie ne peut pas savoir si sa demande coute peu ou beaucoup en crédits Lovable. Il faut un systeme simple qui classe automatiquement les demandes et les regroupe intelligemment en tickets.

### Solution : classification par "impact" + regroupement par urgence

On definit **3 niveaux d'impact** qu'Elodie choisit via des exemples concrets (pas de jargon technique) :

| Impact | Exemples affichés | Tarif |
|--------|-------------------|-------|
| **Retouche** | Changer un texte, une couleur, une image, corriger une faute | Inclus (quota hebdo) |
| **Amélioration** | Ajouter une section, reorganiser un bloc, modifier un formulaire | Inclus (quota hebdo) |
| **Nouvelle fonctionnalité** | Systeme de chat, bons cadeaux multiples, module e-commerce | 20€ ou sur devis |

**Regles de regroupement en tickets** (logique front-end) :
- **Urgent (niveau 1)** : toutes les demandes urgentes de la meme journee sont groupees en 1 ticket (inclus)
- **Important (niveau 2)** : chaque demande = 1 ticket (20€ si "fonctionnalité", sinon inclus)
- **Cool (niveau 3)** : chaque demande = 1 ticket separé
- **À discuter (niveau 4)** : sur devis, pas de ticket auto

Quand Elodie soumet, elle voit un **recapitulatif** : "Cette demande est une **Retouche** → Incluse dans votre forfait" ou "Cette demande est une **Nouvelle fonctionnalité** → 20€/ticket".

### Changements techniques

**1. Migration SQL** — Ajouter colonne `impact` (text, default `'retouche'`) et `ticket_group` (text, nullable) a `feature_requests`

**2. Page Fonctionnalites (`src/pages/admin/Fonctionnalites.tsx`)**
- Ajouter le champ "Type de demande" (Retouche / Amélioration / Fonctionnalité) dans le formulaire de creation
- Afficher le cout estimé en temps reel selon impact + urgence
- Badge d'impact sur chaque carte Kanban (couleur distincte + "Inclus" ou "20€")
- Logique de regroupement : les demandes urgentes du meme jour partagent un `ticket_group`

**3. Page Contrat (`src/pages/admin/Contrat.tsx`)**
- Mettre a jour la Section C pour afficher la grille complete a 2 dimensions (urgence x impact)
- Ajouter un compteur dynamique : nombre de tickets en cours ce mois, cout estimé du mois

### Flux utilisateur

1. Elodie clique "Nouvelle idée"
2. Elle saisit titre + description
3. Elle choisit "Pour qui" et "Niveau d'importance" (urgence)
4. Elle choisit "Type de demande" avec des exemples clairs pour l'aider
5. Un encart recapitulatif apparait : "Retouche urgente → Inclus, groupée avec vos autres demandes urgentes du jour" ou "Fonctionnalité cool → 20€ / ticket"
6. Elle valide

### Fichiers modifies
- `src/pages/admin/Fonctionnalites.tsx` — champ impact, recapitulatif cout, badge enrichi
- `src/pages/admin/Contrat.tsx` — grille urgence x impact, compteur mensuel
- Migration SQL — colonnes `impact` et `ticket_group`

