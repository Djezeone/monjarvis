# P7 — Alignement CBOS™ (Cinematic Business OS, UNTAKA.corp)

**Statut : en construction — briques 1 et 2 livrées.**

JARVIS X2 relu à travers le protocole CBOS™ : *Experience outside,
Intelligence inside*. Les quatre couches CBOS existent déjà dans le
produit, sous d'autres noms — ce document les met en regard, corrige le
score au vu de ce qui est réellement livré, et ne garde comme travail que
ce qui manque vraiment.

## Les quatre couches, telles qu'elles existent

| Couche CBOS | Dans JARVIS X2 |
| --- | --- |
| Experience | Landing cinématique, 8 états du Core, Living Interface, cockpit, PWA installable (P6-4) |
| Operations | Registres appareils / sessions / routines / suggestions / skills, file de commandes, tiers READ-ACT-CRITICAL, approbations FR-009 |
| Intelligence | Hermes (runs, sessions), Graphiti, Presence Bus, suggestions plafonnées, préférences apprises avec provenance, skill learning |
| Deployment | Rôles `facade` / `core` (P6-2), façade Vercel + Core VPS→maison, Identity Pack chiffré, dégradation Core offline, push web |

## Doctrine de mesure (brique 1)

Le CBOS™ demande un écran *Preuve de valeur*. Le modèle proposé comportait
des métriques du type « heures gagnées » et « actions manuelles évitées ».
**JARVIS ne les affichera pas** : rien dans le système n'observe le
contrefactuel, ces nombres seraient inventés — ce qui viole l'invariant
« ne rien simuler » du MASTER_BUILD_PROMPT. La règle retenue :

> Une métrique existe si, et seulement si, un enregistrement réel la porte.
> Ce qui n'est pas mesurable est **nommé** dans l'écran, pas omis en silence.

1. ~~**Impact Layer**~~ ✅ — `impact-rules.ts` (fenêtrage et comptages purs,
   12/12 cas) + `impact.ts` qui agrège **les registres eux-mêmes** (aucun
   store d'analytics parallèle, donc aucune dérive possible) :
   - runs du Core sur la fenêtre, dont ceux que JARVIS a lancés seul
     (routines, skills, reprises de façade) ;
   - actions sur les appareils : exécutées, **échouées**, **refusées**, en
     cours — les échecs sont affichés à côté des succès ;
   - actions CRITICAL passées par une approbation explicite (FR-009) ;
   - proactivité : suggestions levées / livrées / ignorées ;
   - apprentissage par les **décisions humaines** : propositions,
     adoptions, rejets (préférences et skills) ;
   - routines et présence réelles.
   Fenêtres 7 / 30 / 90 jours, panneau cockpit, endpoint
   `GET /api/jarvis/impact?days=N`, et la liste `notMeasured` affichée
   telle quelle. Preuves e2e : deux commandes réellement dispatchées —
   une réussie, une échouée — font bouger les compteurs correspondants ;
   le cockpit affiche l'impact et nomme ce qu'il ne mesure pas.

## Score CBOS, corrigé

L'évaluation initiale (75/100) sous-estimait des briques déjà livrées.
Réalité au moment de ce document :

| Critère | Note | Commentaire |
| --- | --- | --- |
| Clarté de la promesse | 9/10 | |
| Puissance visuelle | 9/10 | pack 77 assets intégré, 493/493 SHA-256 |
| Cohérence narrative | 9/10 | |
| Qualité UX | 7/10 | cockpit encore empilé en panneaux → brique 2 |
| Conversion | 5/10 | pas d'offre publique — hors périmètre actuel |
| Système opérationnel | 15/15 | P4 + P5 complets |
| Automatisation | 9/10 | routines, sweeps, agent satellite ; n8n réel en attente |
| IA utile | 9/10 | |
| Déploiement réel | 5/10 | code prêt (P6 complet) ; **hébergement à faire** |
| Documentation | 5/5 | specs P4, P5, P6, ADR, AUDIT |
| **Total** | **82/100** | |

Ce qui sépare 82 de ~95 n'est plus du code : **Cloud Alpha déployée,
Hermes réel, Graphiti réel, premier workflow n8n réel** dépendent d'un
hébergeur et d'une machine Core, pas d'une brique logicielle. Les chemins
sont écrits et testés contre des doubles ; ils attendent des services.

## Reste à faire (logiciel)

2. ~~**Cockpit en mondes**~~ ✅ — six mondes (Core, Mémoire, Agents,
   Action, Monde, Système) au lieu d'un empilement de quatorze panneaux.
   La règle CBOS est appliquée à la lettre : **entrée cinématique,
   quotidien calme**. Au repos, seul le monde Core est *monté* (les
   autres ne sont pas cachés — ils n'existent pas dans le DOM), avec pour
   unique lecture permanente le bandeau **Aujourd'hui** : quatre chiffres
   réels tirés de l'Impact sur 24 h. Chaque monde est adressable par
   ancre (`/app#action`), retenu d'une visite à l'autre, et une ancre
   inconnue retombe proprement sur le monde mémorisé. Les deux alertes
   qui ne doivent jamais se cacher derrière un onglet restent hors des
   mondes : la bannière **Core hors ligne** et l'overlay vivant.
   **Absences nommées** : là où CBOS annonce un sous-monde que JARVIS n'a
   pas encore (People/Projects/Timeline portés par Graphiti, sous-agents
   Hermes délégués), le monde le dit explicitement au lieu d'exposer une
   étagère vide. Preuves e2e : calme au repos vérifié par l'absence des
   panneaux des autres mondes, ouverture de chaque monde, lien profond +
   persistance + ancre inconnue, et les deux absences nommées.
3. **Hiérarchie de proactivité** — affiner `off/low/normal` en
   SILENT → INFO → USEFUL → IMPORTANT → CRITICAL, chaque niveau choisissant
   son canal (journal, notification, interruption, demande d'action).
4. **Traversée landing → OS** — la caméra traverse le Core et débouche sur
   l'interface réelle, sans page produit intermédiaire.
