# JARVIS Home Node v1 — satellite ambiant (P4)

Un petit node toujours allumé par pièce (classe Raspberry Pi) : **wake word +
capture + haut-parleur + présence**. Aucun LLM sur le node — le calcul reste
au Core.

```text
mic → wake (openWakeWord, voice-runtime :8765)
    → enregistrement du tour (fin de tour par silence RMS)
    → whisper.cpp :8080 (STT)
    → bus local /events {voice.final}
    → Device Agent (pont) → Core /api/jarvis/run   ← session persistante du node
    → réponse → speak (Piper ou espeak-ng) → haut-parleur
```

## Installation

1. Relier le node au mesh privé (Tailscale) ; ne jamais exposer le Core.
2. Démarrer whisper.cpp (`whisper-server` sur `127.0.0.1:8080`) — voir
   `docs/layers/P2/LOCAL_STACK.md`.
3. Enrôler le node : cockpit → Présence → « Enrôler un appareil », coller le
   code dans `config.json` (copie de `config.example.json`).
4. Dépendances puis lancement :

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r ../voice-runtime/requirements.txt -r requirements.txt
python ../voice-runtime/setup_openwakeword_models.py
./start.sh
```

## Ce que fait le node

- **Écoute ambiante honnête** : le wake word tourne en local sur le node ;
  aucun audio ne quitte la pièce avant détection, et seul le tour enregistré
  après le wake part vers whisper (local lui aussi).
- **Une conversation par pièce** : le pont garde une session persistante
  (`node-session.json`) — « continue » dans le salon reprend le fil du salon.
- **`speak`** : réponse prononcée via Piper (`piperUrl`) ou espeak-ng en
  secours ; lecture par `playCommand` (`aplay` par défaut, `{file}` substitué).
- **Présence** : heartbeats avec facts `speaker`/`voiceBridge` — la base du
  routage de sortie (brique 5).
- Sécurité inchangée : token par appareil (ADR-002), allowlist locale,
  CRITICAL impossible sans approbation côté Core.

## Offline Level 0 — « plus de Wi-Fi ≠ plus de JARVIS »

Quand le Core est injoignable (ou son cerveau éteint), le node dégrade
honnêtement au lieu de se taire :

1. **Petit modèle local** si configuré (`offline.ollamaUrl` + `offline.model`,
   ex. Ollama avec un modèle 1-3B sur le node) — la réponse est annoncée
   comme « réponse locale, mode dégradé » ;
2. **Intents locaux déterministes** sans modèle : l'heure, et la prise de
   note ;
3. Tout le reste est **noté** (`offline-queue.json`) avec un message honnête,
   puis **rejoué vers le Core dès son retour** — les notes arrivent dans la
   session de la pièce, préfixées de leur horodatage hors-ligne.

## Limites v1 (assumées)

- Fin de tour par seuil RMS simple — remplacer par une vraie VAD avant de
  considérer l'UX finale (règle P2 : ne pas shipper le recorder simple).
- Un seul wake model partagé ; pas encore d'annulation vocale du tour.
- Licence openWakeWord : ne pas embarquer les modèles pré-entraînés dans une
  distribution commerciale (voir `docs/layers/P2/LOCAL_STACK.md`).
