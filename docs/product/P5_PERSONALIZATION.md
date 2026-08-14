# P5 — PERSONALIZATION / SELF-EVOLUTION

**Statut : en construction — brique 1 livrée.**

Note de numérotation : la roadmap d'origine (`ROADMAP_P0_P6.md`) plaçait la
personnalisation en P4 et la multi-présence en P5. L'architecture Core +
Satellites adoptée (spec P4_OMNIPRESENCE_FABRIC) a inversé l'ordre — avant
d'apprendre davantage sur l'utilisateur, JARVIS devait pouvoir être partout
avec lui. P4 (omniprésence) étant livré, P5 couvre : identité persistante,
modèle de préférences, routines, suggestions proactives, apprentissage de
skills.

## Principes

- **Explicite d'abord** : la brique 1 ne stocke que des préférences
  *déclarées* par l'utilisateur. Aucune inférence silencieuse. Les
  préférences *apprises* (brique 4) seront stockées séparément, avec
  provenance et révision par l'utilisateur — jamais mélangées aux choix
  explicites.
- **Des effets réels, vérifiables** : une préférence qui ne change rien au
  comportement n'existe pas. Chaque préférence a un effet testé.
- **FR-010** : la proactivité est configurable (`off | low | normal`) et
  doit éviter le spam. `off` signifie zéro message non sollicité.

## Ordre de construction

1. ~~**Modèle de préférences explicite**~~ ✅ — store serveur
   (`preference-store.ts`, fichier dans le data dir donc **inclus dans
   l'Identity Pack**), API `GET/PUT /api/jarvis/preferences`, panneau
   cockpit. Effets livrés et testés :
   - langue + ton injectés dans les **instructions de chaque run** ;
   - **heures calmes** : les livraisons voix sont rétrogradées en
     notifications (raison explicite dans la décision de routage) ;
   - **appareil de sortie préféré** : défaut du Presence Bus quand
     l'appelant n'exprime pas de préférence.
2. **Routines** — tâches planifiées côté Core (Hermes Jobs de préférence,
   registre local sinon) dont les résultats partent par `/api/jarvis/deliver`
   — la brique 5 de P4 leur donne un « où » naturel. Respecte proactivité
   + heures calmes.
3. **Suggestions proactives** — déclenchées par les routines/événements,
   plafonnées selon `proactivity`, toujours livrées via le Presence Bus,
   jamais pendant les heures calmes en voix.
4. **Préférences apprises** — observations (« vous demandez souvent X le
   matin ») stockées avec provenance, présentées à l'utilisateur pour
   promotion explicite en préférence — l'inférence propose, l'humain
   dispose.
5. **Skill learning** — capitalisation de procédures répétées en skills
   Hermes réutilisables, derrière approbation.

L'identité persistante, elle, est déjà couverte : sessions (P4-3), mémoire
Graphiti (P3), Identity Pack (P4-7).
