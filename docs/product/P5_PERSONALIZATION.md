# P5 — PERSONALIZATION / SELF-EVOLUTION

**Statut : en construction — briques 1 à 3 livrées.**

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
2. ~~**Routines**~~ ✅ — registre local (fichier data dir → Identity Pack)
   + scheduler au boot du serveur (`instrumentation.ts`, tick 60 s) +
   déclenchement manuel. Chaque exécution est un **vrai run Core**
   (même chemin que `/api/jarvis/run` : session, contexte, préférences)
   dont le résultat part par le **Presence Bus** (même chemin que
   `/deliver` : heures calmes, appareil préféré). `proactivity=off`
   met tout en pause, issue enregistrée honnêtement sur la routine.
   Planifications v1 : quotidienne HH:MM et intervalle N minutes
   (logique d'échéance pure, 8/8 cas unitaires). Panneau cockpit :
   créer, exécuter, pause, supprimer, dernier résultat visible.
   (Hermes Jobs restera le scheduler préféré pour les jobs de
   raisonnement longs — ce registre couvre le besoin local-first.)
3. ~~**Suggestions proactives**~~ ✅ — règles pures observant des signaux
   réels (satellite silencieux depuis N minutes, commande échouée dans la
   fenêtre), balayage branché sur le ticker 60 s du scheduler, plafond
   par heure glissante selon `proactivity` (off = 0, low = 1, normal = 4),
   dédup par (kind, sujet) tant que non ignorée, livraison en
   **notification uniquement** via `deliverMessage` (donc Presence Bus,
   heures calmes, appareil préféré — jamais de voix non sollicitée).
   Panneau cockpit : suggestions actives, où elles ont été livrées,
   bouton Ignorer. 7/7 cas de règles unitaires, e2e sur le cycle complet
   (off → zéro, échec réel → notification dans la file de l'appareil,
   plafond low, dismiss).
4. **Préférences apprises** — observations (« vous demandez souvent X le
   matin ») stockées avec provenance, présentées à l'utilisateur pour
   promotion explicite en préférence — l'inférence propose, l'humain
   dispose.
5. **Skill learning** — capitalisation de procédures répétées en skills
   Hermes réutilisables, derrière approbation.

L'identité persistante, elle, est déjà couverte : sessions (P4-3), mémoire
Graphiti (P3), Identity Pack (P4-7).
