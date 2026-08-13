# JARVIS Device Agent — satellite daemon (P4)

Petit daemon à installer sur chaque appareil satellite. Il donne à JARVIS ses
« mains distribuées » : le Core raisonne, l'appareil exécute — uniquement ce
que **vous** avez allow-listé localement.

## Installation

Prérequis : Node.js ≥ 18. Aucune dépendance npm.

```bash
cd services/device-agent
cp config.example.json config.json
# éditer : coreUrl (adresse mesh du Core), deviceSecret, capabilities
node agent.mjs
```

Côté Core (`apps/web/.env.local`) : définir `JARVIS_DEVICE_SHARED_SECRET`
avec la même valeur que `deviceSecret`.

## Sécurité

- Le Core ne doit **jamais** être exposé sur Internet : reliez les appareils
  par un mesh privé chiffré (Tailscale ou équivalent) et utilisez l'adresse
  mesh dans `coreUrl`.
- L'agent refuse toute capability absente de **son** allowlist locale, quoi
  que demande le Core — le propriétaire de la machine a le dernier mot.
- `app.launch` ne lance que les commandes explicitement mappées dans la
  config ; il n'existe aucune exécution de commande arbitraire dans cet agent.
- Les capabilities CRITICAL (caméra, terminal, filesystem…) exigent une
  approbation explicite côté Core avant même d'être mises en file (HTTP 428
  sinon) — et n'ont volontairement pas d'exécuteur dans cette version.

## Capabilities v1

| Capability | Tier | Effet |
| --- | --- | --- |
| `notify` | ACT | Notification native (notify-send / osascript / BurntToast) |
| `app.launch` | ACT | Lance une application **mappée dans la config** |
| `presence.ping` | READ | Répond pong (test de bout en bout du fabric) |

Les suivantes (camera.capture, clipboard, filesystem lecture seule…) devront
chacune apporter leur exécuteur + leur passage de politique — voir
`docs/product/P4_OMNIPRESENCE_FABRIC.md`.
