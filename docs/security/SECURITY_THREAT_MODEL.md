# Security & Threat Model

## Assets protégés
- credentials ;
- mémoire personnelle ;
- historique d’actions ;
- accès navigateur ;
- Home Assistant ;
- workflows n8n ;
- fichiers locaux ;
- microphone/caméra.

## Menaces principales
1. prompt injection via pages/documents ;
2. exfiltration de secrets par un tool ;
3. action irréversible mal classée ;
4. browser agent hors domaine ;
5. service local exposé publiquement ;
6. stockage excessif de données personnelles ;
7. supply-chain plugin/MCP ;
8. confusion entre état UI et permission réelle.

## Contrôles obligatoires
- secrets server-only ;
- binding loopback par défaut ;
- allowlists tools/workflows/domaines ;
- approval gate ;
- timeouts et step budgets ;
- logs nettoyés ;
- isolation browser ;
- permissions micro/cam visibles ;
- politique mémoire ;
- revue des licences avant distribution.

## Règle critique
Tout paiement, suppression irréversible, publication publique, action légale, credential ou sécurité physique = `CRITICAL`.
