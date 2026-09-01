# P10 — Le lien façade↔Core scellé

**Statut : LIVRÉ (brique 1).**

## Le trou était dans notre propre runbook

`deploy/core/README.md` §7 dit, depuis le kit de déploiement :

> La façade doit joindre le Core, **le monde non**.

Suivaient trois réponses — Tailscale, tunnel, pare-feu — qui sont toutes des
réponses **d'infrastructure**. Rien, dans le code, ne faisait respecter la
phrase. Un Core joignable par un tunnel ou par un port de VPS offrait toute sa
surface d'autorité à qui trouvait l'adresse :

- `/api/jarvis/auth/login` — à marteler jusqu'à trouver le secret ;
- `/api/jarvis/devices/enroll/claim` — porte ouverte par conception (le code à
  usage unique *est* la preuve), donc à essayer en boucle ;
- tout le reste derrière un cookie que l'attaquant était libre de tenter.

Un seul mur, le secret d'authentification, sur une porte ouverte. Et si
l'opérateur se trompait de règle de pare-feu, **rien ne le lui disait**.

## Ce que fait le sceau

`JARVIS_RELAY_SECRET` renseigné des deux côtés : la façade signe chaque requête
proxifiée, le Core refuse tout le reste — **avant l'authentification**, donc
avant même de proposer un formulaire à forcer.

```
x-jarvis-relay: <horodatage>.<HMAC-SHA256>
   sur   jarvis-relay:<horodatage>:<MÉTHODE>:<chemin>
```

Chaque morceau porte une raison :

| Morceau | Ce qu'il empêche |
| --- | --- |
| horodatage (fenêtre 5 min) | une signature captée survit cinq minutes, pas la nuit |
| méthode | rejouer un `GET` anodin en `POST` |
| chemin | rejouer une signature de `/health` sur `/devices/dispatch` |

Une preuve de relais **n'est pas un jeton porteur** qui autoriserait « tout » :
c'est ce que nous remplacions.

## Ce que le sceau n'est pas

- **Pas une couche de confidentialité.** Il prouve *qui* appelle, pas ce qu'il
  a le droit de faire : le cookie de session et les jetons d'appareil décident
  toujours, revérifiés côté Core comme avant.
- **Pas une protection du corps de requête.** Un intermédiaire capable de
  modifier les charges utiles a déjà cassé TLS — autre problème, autre réponse.
- **Pas un remplacement du réseau privé.** Derrière Tailscale, il est superflu.

## Trois conséquences assumées

1. **Les satellites gardent leur porte.** Une requête portant un jeton
   d'appareil traverse le sceau : c'est une preuve *par machine*, plus forte
   qu'un secret partagé, et verrouiller les satellites hors de leur propre Core
   n'achèterait rien. Un jeton bidon contourne ce garde et rencontre la route,
   qui répond 401 : le sceau réduit la surface anonyme, il ne remplace pas les
   serrures derrière lui.
2. **Le cockpit passe par la façade, même chez vous.** Sceller, c'est décider
   que l'adresse de JARVIS est celle de la façade. `/app` et la landing restent
   servis par le Core — mais chacune de leurs actions passe par `/api`, donc
   par le sceau.
3. **Les horloges comptent.** Au-delà de cinq minutes de dérive, le verdict est
   `expiré`, distinct de `invalide`. La distinction ne dit rien à un attaquant
   qu'il n'apprendrait en essayant, et elle dit à l'opérateur la seule chose qui
   compte : horloge décalée, ou secret qui ne correspond pas.

## Le refus est diagnostiqué, pas subi

Avant cette brique, la sonde de la façade tenait « toute réponse HTTP » pour un
cerveau joignable. Un Core scellé répond 403 — une réponse HTTP. La façade
aurait affiché **« cerveau joignable »** pendant que chaque appel échouait.

Désormais la sonde signe elle aussi, et `/api/jarvis/facade/status` distingue
trois états : `off` (aucun sceau configuré), `ok`, `refused`. Le cockpit affiche
alors un bandeau qui nomme la cause et les deux choses à vérifier, au lieu d'un
faux « hors ligne ».

`npm run smoke` fait de même : sans `--relay-secret` contre un Core scellé, il
s'arrête sur « Sceau de relais accepté — absent » plutôt que de conclure que le
déploiement est cassé.

## Preuves

`e2e/relay.spec.ts`, contre deux instances réelles — un Core scellé (:3105) et
la seule façade qui détient le même secret (:3106) :

| Ce qui est prouvé | Résultat attendu |
| --- | --- |
| login anonyme sur un Core scellé | 403 `absent` — avant tout formulaire |
| claim d'enrôlement anonyme | 403 |
| signature valide | 200 |
| signature rejouée sur une autre route | 403 `invalide` |
| signature rejouée avec une autre méthode | 403 |
| signature vieille de 20 minutes | 403 `expiré` |
| mauvais secret | 403 `invalide` |
| satellite avec son jeton, sans sceau | 200 |
| paire complète : façade signe → run réel | 200 |
| façade sans sceau | verdict `off`, jamais un faux « ok » |

Et hors Playwright, `scripts/smoke-deployment.mjs` exécuté contre ce même Core
scellé : refusé sans `--relay-secret`, chaîne entièrement verte avec.
