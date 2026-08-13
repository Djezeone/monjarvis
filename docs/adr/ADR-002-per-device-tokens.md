# ADR-002 — Tokens par appareil avec enrôlement à code unique

**Date : 2026-08-13 · Statut : accepté · Remplace l'auth v0 de l'ADR-001**

## Contexte

Le fabric v0 (ADR-001) authentifiait tous les device agents avec un secret
partagé unique (`JARVIS_DEVICE_SHARED_SECRET`). Limitation assumée et
documentée : un appareil compromis imposait une rotation du secret sur tous
les appareils, et un agent pouvait techniquement se faire passer pour un
autre appareil.

## Décision

1. **Enrôlement à code unique** : l'opérateur crée depuis le cockpit un code
   d'enrôlement à usage unique (TTL 10 min). L'agent l'échange une seule fois
   contre un **token par appareil** (`POST /api/jarvis/devices/enroll/claim`).
2. **Stockage haché** : le Core ne conserve que le SHA-256 du token (et du
   code d'enrôlement) ; le plaintext n'est montré qu'une fois, à l'émission.
   Comparaisons en temps constant (`timingSafeEqual`).
3. **Identité liée** : le token identifie exactement un appareil ; un token
   valide présenté pour l'URL d'un autre appareil est rejeté (403). Un
   satellite ne peut pas agir pour un autre.
4. **Révocation immédiate** : `POST /api/jarvis/devices/[id]/revoke` (bouton
   cockpit) efface le hash et marque l'appareil révoqué — heartbeat/poll
   suivants en 401, dispatch vers lui en 410 ; l'agent s'arrête proprement.
5. **Plus de variable d'environnement d'auth fabric** :
   `JARVIS_DEVICE_SHARED_SECRET` disparaît. L'état « fabric éteint » devient
   l'état naturel « aucun appareil enrôlé ». La frontière de confiance des
   endpoints opérateur (enroll/dispatch/revoke) reste le cockpit lui-même,
   accessible uniquement via le mesh privé — inchangé depuis l'ADR-001.
6. **Côté agent** : le token est écrit dans `device-token.json` (chmod 600) à
   côté de la config ; le code d'enrôlement peut ensuite être retiré de la
   config. Un 401 (révocation) arrête l'agent avec un message de
   ré-enrôlement.

## Migration depuis v0

Le fabric v0 n'a jamais été un contrat public : les appareils existants se
ré-enrôlent une fois (code depuis le cockpit) et le champ `deviceSecret`
de leur config devient inutile. `.env.example` et les guides sont à jour.

## Conséquences

- (+) Compromission d'un appareil → révocation de ce seul appareil.
- (+) Aucune valeur secrète réutilisable dans la config versionnable de
  l'agent ; le token vit hors config, non commitable.
- (+) Isolation inter-appareils garantie par le serveur (403), plus seulement
  par la bonne volonté des agents.
- (−) L'enrôlement demande une action opérateur par appareil — voulu : c'est
  une décision explicite, cohérente avec la philosophie d'approbation du
  produit.
- (−) Les endpoints opérateur restent sans auth propre (confiance = accès au
  cockpit via le mesh). Un durcissement (session opérateur) pourra suivre si
  le cockpit devient multi-utilisateur.
