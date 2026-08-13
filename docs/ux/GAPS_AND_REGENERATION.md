# Gaps & Regeneration Queue

Le workspace contient actuellement **81 PNG visuels récupérables**. Certaines générations antérieures ont utilisé le chemin transitoire `imagegen.png`, ensuite réécrit par des générations plus récentes. Le pack ne fabrique donc pas de faux fichiers pour les images devenues inaccessibles.

`assets/manifests/regeneration-queue.csv` compare le système visuel cible aux assets effectivement disponibles.

## Priorité
1. Régénérer uniquement les `missing_exact_asset`.
2. Ne pas régénérer un asset si un asset existant couvre déjà correctement l’usage.
3. Pour les Agents, privilégier une série cohérente : même cadrage, lumière, perspective et densité visuelle.
4. Pour les états UI, préférer des assets plus simples que les grandes illustrations.
