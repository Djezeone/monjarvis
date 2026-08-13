# ADR-001 — Core + Satellites : un Device Agent plutôt que des tools Hermes distants

**Date : 2026-08-13 · Statut : accepté**

## Contexte

JARVIS X2 P0→P3 est local-first mais mono-machine. L'objectif P4 est
l'omniprésence : la même identité JARVIS accessible depuis téléphone, laptop
et maison.

Contrainte upstream déterminante : lorsqu'une instance Hermes est distante,
**ses tools s'exécutent sur la machine qui héberge Hermes** (documentation
Hermes : les tools d'une instance distante sont eux aussi distants). Déporter
Hermes ne donne donc pas de « mains » sur les autres appareils.

## Décision

1. **Architecture Core + Satellites.** Un seul Core résident (machine
   toujours allumée) héberge Hermes/Ollama/Graphiti/Neo4j/n8n/Policy Engine.
   Les appareils sont des satellites légers : portes d'accès + capabilities
   locales.
2. **Device Agent dédié** (`services/device-agent`) sur chaque satellite,
   plutôt que d'étendre Hermes : daemon minimal qui s'enregistre au Core,
   heartbeat sa présence, polle sa file de commandes et exécute uniquement
   son allowlist locale. Double verrou : Policy Engine côté Core (tiers
   READ/ACT/CRITICAL, approbation exigée pour CRITICAL) **et** allowlist
   côté appareil (le propriétaire de la machine a le dernier mot).
3. **Mesh privé chiffré, jamais d'exposition publique** du port Hermes ni du
   Core (Tailscale en pratique ; l'auto-hébergé type Headscale reste ouvert).
4. **Transport v0 : polling HTTP** sur le mesh (simple, robuste aux NAT,
   suffisant à ~5 s de latence). Upgrade prévu : WebSocket/SSE pour la
   latence voix, sans changer le contrat de commandes.
5. **Auth v0 : secret partagé** `JARVIS_DEVICE_SHARED_SECRET`. Limitation
   assumée et documentée ; upgrade : token par appareil, révocable, émis à
   l'enrôlement.

## Conséquences

- (+) Aucun modèle lourd requis sur téléphone/laptop ; le Core se migre d'un
  matériel à l'autre (Identity Pack) sans changer les satellites.
- (+) Surface d'attaque bornée : fabric éteint par défaut (503 sans secret),
  capabilities doublement allow-listées, CRITICAL bloqué sans approbation.
- (−) Le polling v0 n'est pas adapté au streaming audio temps réel — le
  Remote Voice passera par le runtime voix (WebSocket) et non par la file de
  commandes.
- (−) Secret partagé v0 : compromission d'un appareil = rotation du secret
  partout, jusqu'à l'upgrade token-par-appareil.
