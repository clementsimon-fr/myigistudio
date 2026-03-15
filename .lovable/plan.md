

## Analyse

Le code actuel distingue déjà **courses** (crédits) et **workshops** (paiement Stripe). Cependant, l'interface ne reflète pas clairement cette différence côté utilisateur :

1. **Pas de prix affiché** dans le résumé pour les ateliers/poterie
2. Le bouton dit toujours "Confirmer la réservation" même pour un atelier payant — il devrait indiquer le prix
3. L'info crédit s'affiche correctement uniquement pour les cours (déjà OK)

## Modifications prévues

### `src/pages/Reserver.tsx`

1. **Afficher le prix dans le résumé** : ajouter une ligne "Prix : XX €" dans le bloc récapitulatif (lignes 578-595) quand `isWorkshopDirect && activity.price`

2. **Adapter le libellé du bouton de confirmation** :
   - Cours yoga → "Confirmer la réservation" (utilise 1 crédit)
   - Atelier/poterie → "Payer XX € et réserver" avec icône panier

3. **Afficher un badge contextuel** dans le résumé :
   - Cours → "1 crédit sera déduit"
   - Atelier → "Paiement par carte"

### Fichier impacté

| Fichier | Changement |
|---------|-----------|
| `src/pages/Reserver.tsx` | Afficher prix dans résumé, adapter libellé bouton selon type d'activité |

