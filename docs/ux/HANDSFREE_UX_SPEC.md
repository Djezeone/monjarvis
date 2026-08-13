# UX / Hands-Free Specification

## États
`idle → wake → listening → understanding → thinking → acting → speaking → idle`
avec `warning` accessible depuis tout état pertinent.

## Règles
- `idle`: interface minimale.
- `wake`: confirmation visuelle courte.
- `listening`: transcript partiel visible.
- `understanding`: feedback immédiat.
- `thinking`: activité de haut niveau, jamais chaîne de pensée privée.
- `acting`: outil et statut affichés.
- `speaking`: barge-in prévu.
- `warning`: interruption claire et actionnable.

## Entrées
1. wake word local ;
2. push-to-talk ;
3. texte ;
4. tactile ;
5. pointeur ;
6. plus tard : gestes opt-in.

## Accessibilité
Aucune action essentielle ne dépend d’un hover, d’un geste ou de l’audio.
