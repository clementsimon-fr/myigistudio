

## Analyse du processus de réservation Yoga/Pilates

### Parcours actuel (problématique)

```text
Visiteur sur /discover
  → Clique "Réserver" sur un cours Yoga
  → Redirigé vers /reserver avec date+créneau pré-sélectionnés
  → S'il n'est pas connecté → redirigé vers /login
  → Il se connecte ou crée un compte
  → Retour sur /reserver avec le créneau
  → Voit immédiatement "0 crédits disponibles"
  → Clique "Confirmer" → écran "Crédits insuffisants" avec options d'achat
  → Achète une carte → Stripe simulé → réservation auto-confirmée
```

### Problèmes identifiés

1. **Aucune pédagogie sur le système de crédits** : un nouveau client arrive sur la page de réservation, voit "0 crédits disponibles" sans comprendre ce que c'est ni pourquoi c'en est nécessaire. Le badge "1 crédit sera déduit" dans le résumé est cryptique pour un primo-visiteur.

2. **L'étape d'achat arrive trop tard et par surprise** : l'utilisateur remplit tout (date, créneau, conditions), clique "Confirmer", et là seulement on lui dit qu'il manque de crédits. Sentiment de blocage.

3. **Pas de distinction primo-visiteur vs client habitué** : Sophie (4 crédits) et un nouveau compte (0 crédits) voient exactement la même interface. Sophie comprend les crédits, le nouveau non.

4. **Après création de compte, aucun onboarding** : le Register redirige directement vers /reserver sans explication du fonctionnement.

### Solution proposée

Restructurer le flux en **guidant progressivement** selon le profil :

#### A. Nouveau client (0 crédits) — Parcours guidé

```text
Visiteur clique "Réserver" sur Yoga
  → /reserver : date + créneau pré-sélectionnés
  → Pas connecté → redirect /login
  → Crée un compte (prénom) → retour /reserver
  → NOUVEAU : Encart pédagogique AVANT le résumé :
      ┌─────────────────────────────────────────────┐
      │ 🎯 Comment ça marche ?                      │
      │                                              │
      │ Les cours de Yoga & Pilates fonctionnent     │
      │ avec un système de crédits :                 │
      │                                              │
      │  1. Achetez une carte de cours               │
      │  2. Chaque réservation utilise 1 crédit      │
      │  3. Réservez autant de cours que vous voulez │
      │                                              │
      │ [Acheter une carte pour réserver]             │
      └─────────────────────────────────────────────┘
  → Clique → voit les 3 options de carte (1/5/10 cours)
  → Paie via Stripe simulé
  → Retour automatique à la confirmation
```

#### B. Client existant avec crédits — Parcours direct

```text
Client connecté clique "Réserver"
  → /reserver : voit "4 crédits disponibles" ✓
  → Résumé + conditions → "Confirmer la réservation"
  → Réservation confirmée
```

#### C. Client existant sans crédits — Parcours intermédiaire

```text
Client connecté, 0 crédits
  → /reserver : encart simplifié (pas la pédagogie complète)
      "Vous n'avez plus de crédits. Rechargez pour réserver."
      [Acheter une carte]
  → Même flux d'achat
```

### Modifications techniques dans `src/pages/Reserver.tsx`

| Changement | Détail |
|---|---|
| **Encart pédagogique** | Nouveau bloc affiché quand `needsCredits && currentProfile?.credits === 0` et que le profil n'a aucune carte (primo-visiteur). Explique le système de crédits avec 3 étapes visuelles. Bouton CTA vers l'étape d'achat. |
| **Déplacer l'étape crédits AVANT le bouton confirmer** | Au lieu de montrer les options d'achat seulement après le clic sur "Confirmer", les afficher directement dans le flux quand crédits = 0. Le bouton "Confirmer" est remplacé par le CTA d'achat. |
| **Adapter le badge résumé** | Pour un primo-visiteur : ne pas afficher "1 crédit sera déduit" (déroutant). Afficher plutôt "Carte de cours requise". Pour un client avec crédits : garder "1 crédit sera déduit" (familier). |
| **Supprimer le message brut "0 crédits"** | Remplacer l'encart `{currentProfile.credits} crédit(s) disponible(s)` par un message context