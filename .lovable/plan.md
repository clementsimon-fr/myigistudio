

# Plan : Fonctionnalité "Prendre du Recul"

## Architecture

Un bouton cercle discret en bas de la page `Fonctionnalites.tsx` ouvre un parcours en 4 étapes dans un composant dédié `PrendreRecul.tsx`. Tout est local (state React), aucun impact sur l'existant.

## Données : La Matrice Intégrale

Codée en dur dans un fichier `src/data/matriceData.ts` contenant les 13 lignes du tableau avec pour chaque mission :
- `pole` : "gestion" | "pilotage" | "production"
- `mission`, `outil`, `frequence`, `chargeMentaleRecommandee`, `arbitrageRecommande`
- `recommendedAction` : "automatiser" | "deleguer" | "simplifier" | "presence" | "flow" | "vigilance" | "transmission" | "decider" | "filtrer" | "ressourcer" | "nourrir"
- `besoinType` : "competence" | "outil" | "les_deux"
- `featureSuggestion` : proposition de fonctionnalité associée (texte)

## Composant : `src/components/admin/PrendreRecul.tsx`

### Étape 1 — Diagnostic "Météo de l'Activité"
- Message d'intro calme : "Prenons 5 minutes pour aligner votre quotidien avec votre vision."
- Pour chaque mission de la matrice (groupée par pôle avec en-têtes visuels), 3 questions via des boutons-choix (pas de slider) :
  - **Temps passé** : ⏱️ Peu / Beaucoup / Trop
  - **Charge mentale** : 🧘 Zen / Gérable / Épuisante
  - **Envie** : ❤️ J'adore / 😐 Il le faut / 🤢 Je déteste
- Bouton "Voir mes résultats" actif quand toutes les missions sont renseignées
- Progression visuelle (barre ou steps)

### Étape 2 — Simulateur de Réalité
- Pour chaque mission, un bloc comparatif :
  - **Votre réalité** : résumé des réponses (temps, charge, envie) avec des badges colorés
  - **Recommandation** : l'arbitrage recommandé du tableau (ex: "À Automatiser") avec explication courte
  - Un indicateur visuel d'écart (vert = aligné, orange = ajustement possible, rouge = écart important)
- Logique d'écart : si temps="Trop" + charge="Épuisante" + envie="Je déteste" et recommandation="automatiser" → écart rouge. Si envie="J'adore" même si recommandation="déléguer" → vert (l'envie prime)
- Bouton "Comprendre mes résultats"

### Étape 3 — Ajustement par le Sens
- Calcul du temps libérable : somme des missions où l'utilisateur a dit "Trop" ou "Beaucoup" ET "Il le faut" ou "Je déteste" → estimation en heures/semaine
- Message personnalisé : "En ajustant les tâches que vous n'aimez pas, vous libérez ~X heures par semaine. Imaginez ce temps pour [cœur de métier basé sur les missions "J'adore"]."
- Gestion de l'exception envie : si une mission est recommandée "déléguer" mais l'utilisateur a dit "J'adore", afficher un encart positif : "Vous aimez [mission] ? Parfait. Ce n'est plus une corvée mais un temps de ressourcement."
- Séparation des besoins identifiés en 2 colonnes :
  - 🎓 **Compétences** : formations/apprentissages utiles
  - 🔧 **Outils** : solutions logicielles/process
- Bouton "Voir les solutions"

### Étape 4 — Proposition de Valeur
- Liste des fonctionnalités suggérées, filtrées par les missions où il y a un écart ET l'envie n'est pas "J'adore"
- Chaque proposition : titre, description courte, lien avec la mission identifiée
- Bouton "Recommencer" pour refaire le diagnostic
- Bouton "Fermer"

## Intégration dans `Fonctionnalites.tsx`

- Ajout d'un state `reculeOpen` 
- Un bouton cercle fixe (`fixed bottom-6 right-6`) avec une icône subtile (ex: `Eye` ou `Compass`) et un tooltip "Prendre du recul"
- Au clic, affiche `<PrendreRecul />` en plein écran (Dialog fullscreen ou page overlay)
- Aucune modification des fonctionnalités existantes

## Fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| `src/data/matriceData.ts` | Créer — données de la matrice intégrale |
| `src/components/admin/PrendreRecul.tsx` | Créer — composant principal 4 étapes |
| `src/pages/admin/Fonctionnalites.tsx` | Modifier — ajouter bouton cercle + state + import |

