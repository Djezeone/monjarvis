# JARVIS X2 — Product Requirements Document
**Version 1.0 — 13 août 2026**

## 1. Résumé
JARVIS X2 est un **Personal Agent OS** local-first : une intelligence personnelle persistante capable de converser, mémoriser, percevoir le contexte, déléguer à des agents, utiliser des outils et agir sur le monde numérique ou physique sous contrôle de politiques explicites.

Le produit vise deux exigences simultanées :
1. **utilité quotidienne réelle**, notamment en mode hands-free ;
2. **expérience visuelle contemporaine de niveau award**, cinématique à l’entrée mais calme et ergonomique dans l’usage quotidien.

Le fonctionnement de base doit pouvoir rester **gratuit au maximum** grâce à l’inférence locale et à des briques open source/self-hosted.

## 2. Vision produit
> Une intelligence personnelle présente plutôt qu’une interface à piloter.

JARVIS X2 doit réduire le nombre de clics et de panneaux nécessaires pour accomplir une intention. L’utilisateur exprime ce qu’il veut ; le système reconstruit le contexte, propose ou exécute l’action autorisée, vérifie le résultat et mémorise ce qui mérite de l’être.

## 3. Principes non négociables
- Local-first, cloud optionnel.
- Hands-free-first, jamais hands-free-only.
- Microphone et caméra désactivés par défaut.
- Aucune action sensible ne doit être déclenchée par une simple animation ou un état visuel.
- Les secrets restent côté serveur.
- Les actions CRITICAL exigent une approbation explicite.
- La mémoire persistante stocke le contexte durable, pas chaque phrase.
- L’interface doit rester utilisable sans WebGL, sans voix et sans effets de curseur.
- Pas de copie esthétique d’Iron Man : langage visuel original, contemporain et spatial.
- Les composants d’infrastructure doivent être remplaçables.

## 4. Utilisateurs cibles
### Principal
Utilisateur individuel avancé souhaitant centraliser travail, recherche, projets, automatisations, appareils et mémoire personnelle autour d’un agent persistant.

### Secondaires
- développeur / maker local-first ;
- indépendant / dirigeant souhaitant automatiser les opérations ;
- foyer connecté via Home Assistant ;
- utilisateur souhaitant une couche de contrôle conversationnelle au-dessus de ses outils.

## 5. Jobs-to-be-done
- « Retrouve le contexte sans que je doive tout réexpliquer. »
- « Fais la recherche et synthétise ce qui compte. »
- « Exécute cette tâche dans mes outils sans me faire traverser cinq interfaces. »
- « Prépare ou délègue le travail pendant que je fais autre chose. »
- « Dis-moi clairement quand une action a un impact important et demande mon accord. »
- « Pilote mes automatisations et appareils sans exposer mes credentials. »
- « Reste utilisable à la voix, au clavier, au tactile et au pointeur. »

## 6. Parcours principal
1. Détection d’intention par voix ou texte.
2. Récupération du contexte de session et de la mémoire pertinente.
3. Raisonnement par le Core.
4. Éventuelle délégation à un sous-agent.
5. Sélection d’un outil.
6. Passage par Policy Engine.
7. Approbation humaine si nécessaire.
8. Exécution.
9. Vérification du résultat.
10. Réponse concise et, si pertinent, mise à jour de la mémoire.

## 7. Exigences fonctionnelles

### FR-001 — Conversation multimodale
Le système accepte texte et voix, expose clairement l’état `idle / wake / listening / understanding / thinking / acting / speaking / warning`.

### FR-002 — Hands-free
L’utilisateur peut activer volontairement un mode wake-word local, revenir au mode push-to-talk et annuler immédiatement avec clavier/touch.

### FR-003 — Mémoire temporelle
Le système peut rechercher et écrire des faits/épisodes durables avec historique temporel et provenance.

### FR-004 — Core agent
Un Core orchestre runs, outils, sous-agents, stop, streaming de progression et approbations.

### FR-005 — Sous-agents
Le Core peut déléguer des sous-tâches ; l’UI montre statut, durée et résumé sans exposer la chaîne de pensée privée.

### FR-006 — Browser / computer use
La capacité browser est isolée derrière un worker avec domaine, durée et nombre d’étapes limités.

### FR-007 — Automatisation
JARVIS X2 peut lancer des Jobs de raisonnement et des workflows n8n allowlistés.

### FR-008 — Physical World
Le système lit Home Assistant ; les contrôles sensibles (serrures, alarmes, sécurité) sont CRITICAL.

### FR-009 — Approval Gate
Une action critique présente cible, conséquences, données affectées et réversibilité avant approbation.

### FR-010 — Jobs et proactivité
Le système peut exécuter des jobs planifiés ; la proactivité est configurable et doit éviter le spam.

### FR-011 — Design cinématique
La landing utilise Core 3D, scrolling narratif, transitions et environnements visuels sans scroll hijacking.

### FR-012 — Progressive enhancement
Le produit fonctionne avec un fallback 2D lorsque WebGL n’est pas disponible ou performant.

### FR-013 — Assets
Les écrans utilisent le manifest fourni ; aucune substitution par emoji ou illustrations génériques sans décision explicite.

### FR-014 — Diagnostics
Routes lab : `/lab/core`, `/lab/cinematic`, `/lab/living`, `/lab/intelligence`.

### FR-015 — Mode local
Un utilisateur peut exécuter le chemin quotidien sans API payante obligatoire.

## 8. Exigences non fonctionnelles
### NFR-001 Performance
60 fps cible desktop ; 45–60 fps mobile pour les scènes animées. Les canvases hors viewport sont pausés.

### NFR-002 Confidentialité
Aucun flux audio brut n’est persisté par défaut. Caméra OFF par défaut. Logs nettoyés des secrets.

### NFR-003 Sécurité
Secrets serveur uniquement, endpoints locaux bindés à `127.0.0.1` par défaut, politiques d’action, audit des approbations.

### NFR-004 Résilience
Chaque organe peut tomber sans empêcher `/app` de charger. Les fallbacks doivent être explicites.

### NFR-005 Accessibilité
Navigation clavier, labels lecteurs d’écran, reduced motion, alternatives non vocales à toute commande primaire.

### NFR-006 Maintenabilité
Adapters pour LLM, mémoire, STT, TTS, browser et automation ; aucune dépendance métier dans les composants visuels.

## 9. Stack cible
- Frontend : Next.js / React.
- 3D : React Three Fiber / Three.js.
- Motion : Motion.
- Core : Hermes Agent.
- Inference : Ollama / LocalAI.
- Memory : Graphiti + Neo4j.
- STT : whisper.cpp.
- Wake word : moteur local interchangeable.
- TTS : Piper ou alternative locale interchangeable.
- Workflows : n8n.
- Physical : Home Assistant.
- Browser : Browser Use derrière worker sandboxé.
- Realtime cross-device optionnel : LiveKit.

## 10. Taxonomie de risque
### READ
Recherche, inspection, synthèse, états.

### ACT
Actions réversibles et limitées.

### CRITICAL
Paiement, suppression, publication publique, credentials, production, juridique, sécurité physique.

## 11. UX cible
Landing spectaculaire ; cockpit quotidien sobre. Le Core est le principal indicateur d’état. Les panneaux apparaissent au moment où ils ont une valeur opérationnelle.

## 12. Indicateurs produit
- taux de succès tâche de bout en bout ;
- taux d’actions nécessitant reprise manuelle ;
- latence wake→transcript et transcript→premier feedback ;
- taux de faux wake ;
- taux d’approbation/rejet des actions CRITICAL ;
- rappel mémoire jugé pertinent ;
- nombre moyen d’interactions UI nécessaires par tâche ;
- disponibilité du chemin local sans cloud.

## 13. Hors périmètre immédiat
- autonomie financière sans confirmation ;
- décisions juridiques ou médicales autonomes ;
- contrôle de sécurité physique non confirmé ;
- reconnaissance émotionnelle présentée comme certaine ;
- surveillance caméra permanente ;
- auto-modification illimitée du système.

## 14. Critères de release V1
- P0→P3 intégrés et compilés ;
- commande texte/voix → run Hermes réel ;
- mémoire locale fonctionnelle ;
- stop + approval testés ;
- un workflow n8n allowlisté ;
- lecture Home Assistant ;
- fallback sans WebGL ;
- aucune clé sensible dans le bundle client ;
- parcours mobile complet ;
- pack d’assets utilisé via manifest ;
- suite E2E et threat-model review terminées.
