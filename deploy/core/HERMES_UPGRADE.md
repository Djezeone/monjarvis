# Monter Hermes en version — runbook VPS

Hermes est le seul organe **bloquant** du Core : sans lui, le cockpit répond 503
à toute demande (`scripts/preflight.mjs`). Sa montée de version se fait donc
avec la même discipline qu'un déploiement, pas à la volée.

Ce runbook s'exécute **en SSH sur le VPS**. Aucune API Hermes ne met Hermes à
jour : `hermes update` est une commande CLI. Un agent qui n'a que l'API (ou que
n8n) ne peut pas faire cette opération à votre place.

Référence amont : <https://github.com/NousResearch/hermes-agent/releases>

---

## 0. Savoir d'où l'on part

```bash
ssh <votre-vps>
sudo -u jarvis hermes --version
```

Notez le numéro **avant** de toucher à quoi que ce soit : c'est votre point de
retour (§6). Comparez-le à la dernière version publiée sur la page des
releases ci-dessus.

Deux choses à vérifier dans la même foulée :

```bash
sudo -u jarvis hermes update --check     # que ferait la mise à jour, sans rien changer
sudo -u jarvis hermes doctor             # config, dépendances, santé des services
```

Si `hermes doctor` est déjà rouge **avant** la mise à jour, réglez-le d'abord.
Monter de version par-dessus une installation cassée transforme un problème
identifiable en deux problèmes mêlés.

## 1. Fenêtre et annonce

Le redémarrage de la passerelle est *drain-first* : le travail en vol se
termine avant que la passerelle ne sorte, dans la limite de
`agent.restart_after_turn_timeout` (30 minutes par défaut). L'indisponibilité
réelle est de l'ordre de quelques secondes à quelques dizaines de secondes,
mais elle n'est pas nulle.

Conséquence concrète : pendant la fenêtre, le cockpit et les satellites
reçoivent 503 sur les runs. Choisissez un créneau sans routine cron Hermes
programmée.

## 2. Sauvegarder — les deux choses qui comptent

```bash
# 1. L'état de JARVIS (le seul répertoire qui compte côté Core)
node /opt/jarvis/monjarvis/scripts/identity-pack.mjs export --out ~/jarvis-pre-hermes-$(date +%F).pack

# 2. L'état de Hermes lui-même, sauvegarde complète
sudo -u jarvis hermes update --backup
```

`hermes update` prend de lui-même un instantané léger (configuration,
authentification, fichiers runtime) avant d'agir. `--backup` demande la
sauvegarde **complète** — c'est ce que vous voulez sur un profil qui porte de
la mémoire et des routines accumulées.

Pour rendre ce comportement permanent, dans le `config.yaml` de Hermes :

```yaml
updates:
  pre_update_backup: full
```

## 3. Mettre à jour

```bash
sudo -u jarvis hermes update
```

La commande enchaîne : instantané → `git pull` depuis `main` → validation
syntaxique des fichiers de démarrage (rollback automatique si le parsing
échoue) → `uv pip install -e ".[all]"` → migration de configuration →
reconstruction du Desktop s'il existe → redémarrage de la passerelle.

**Ne sautez pas l'invite de migration de configuration.** Si vous l'avez
passée, rattrapez-la à la main :

```bash
sudo -u jarvis hermes config check
sudo -u jarvis hermes config migrate
```

### Variantes selon le mode d'installation

Hermes détecte son propre mode d'installation et `hermes update` imprime la
commande correspondante. Si vous devez agir manuellement :

**Installation par l'installeur git** (le cas de ce dépôt, cf. §3 du README) :

```bash
cd /path/to/hermes-agent
export VIRTUAL_ENV="$HOME/.hermes/venvs/hermes-dev"
export PATH="$VIRTUAL_ENV/bin:$PATH"
git pull origin main
uv pip install -e ".[all]"
hermes config check
hermes config migrate
```

**Docker** — les installations gérées par Docker refusent la mise à jour en
place. Hermes imprime la commande à exécuter :

```bash
docker pull nousresearch/hermes-agent:latest
```

**Nix** :

```bash
nix flake update hermes-agent    # ou : nix profile upgrade hermes-agent
```

### Rester sur une branche non par défaut

```bash
sudo -u jarvis hermes update --branch release-candidate
```

À réserver aux tests. Le Core de production suit `main`.

## 4. Valider — quatre contrôles, dans cet ordre

```bash
cd /path/to/hermes-agent && git status --short   # 1. aucun changement inattendu
sudo -u jarvis hermes doctor                     # 2. config, dépendances, santé
sudo -u jarvis hermes --version                  # 3. la version a bien avancé
sudo -u jarvis hermes gateway status             # 4. la passerelle tourne
```

Un arbre git sale après la mise à jour n'est pas un détail : enquêtez avant
d'aller plus loin.

## 5. Prouver que la chaîne JARVIS vit encore

La montée de version de Hermes n'est terminée que quand le Core la traverse
pour de bon. Les deux outils du dépôt, dans cet ordre :

```bash
cd /opt/jarvis/monjarvis/apps/web
npm run preflight -- --probe                    # configuration + sondes réelles
node ../../scripts/verify-local-stack.mjs       # run, stop, approbation réels
```

`verify-local-stack.mjs` ne simule rien : il lance un vrai run jusqu'à
complétion, en arrête un autre en cours, et traverse le chemin d'approbation.
C'est ce qui distingue « Hermes répond » de « Hermes fonctionne ».

Puis la vérification d'acceptation de bout en bout :

```bash
npm run smoke -- --base http://127.0.0.1:3000
```

Si vous avez scellé le lien façade↔Core (§7 bis du README), ajoutez
`--secret` et `--relay-secret`.

## 6. Revenir en arrière

```bash
cd /path/to/hermes-agent
git log --oneline -10          # identifier le commit cible
git checkout <commit-hash>     # ou : git checkout vX.Y.Z
uv pip install -e ".[all]"
hermes gateway restart
```

Le retour en arrière peut rendre la configuration incompatible : relancez
`hermes config check` et retirez de `config.yaml` les options que Hermes ne
reconnaît plus.

Si l'état de Hermes lui-même est en cause, c'est la sauvegarde de §2 qui sert.
Si c'est l'état de JARVIS, c'est l'Identity Pack.

---

## Points de vigilance

**Clés d'API par profil.** Depuis juillet 2026, une clé valide du profil par
défaut n'est plus acceptée sur un préfixe `/p/<profil>/`. Si vous partagiez une
clé unique entre préfixes, chaque profil doit désormais porter son propre
`API_SERVER_KEY` dans son `.env`, sinon les appels reviennent en `401`. Le Core
de ce dépôt appelle Hermes sans préfixe de profil : il n'est pas concerné en
l'état, mais toute introduction de profils l'exposerait.

**Windows.** Sans objet sur le VPS, mais pour mémoire : fermez le Desktop,
sortez des REPL et arrêtez la passerelle (`hermes gateway stop`) avant de
mettre à jour, sinon Hermes refuse d'agir tant qu'un `hermes.exe` tient
l'exécutable du venv.

**Mise à jour depuis un canal de messagerie.** Hermes accepte `/update` depuis
Telegram, Discord, Slack, WhatsApp ou Teams. Le bot part hors ligne 5 à 15
secondes le temps du redémarrage. Pratique, mais cela court-circuite les
sauvegardes de §2 et les validations de §4 et §5 : sur le Core de production,
préférez le chemin SSH de ce runbook.

**Le pilote computer-use.** `hermes update` relance l'installeur amont en fin
de parcours si `cua-driver` est sur le `PATH`. `--upgrade` force ce relancement.
L'installeur amont tire toujours la dernière version : c'est une mise à jour en
place, pas une version épinglée.
