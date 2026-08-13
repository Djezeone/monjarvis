# jarvis-memory Hermes plugin

Copy this directory to:

`~/.hermes/plugins/jarvis-memory/`

Set:
`JARVIS_GRAPHITI_URL=http://127.0.0.1:8771`

Enable:
`hermes plugins enable jarvis-memory`

Restart the Hermes gateway, then verify with:
`hermes plugins list`
and `GET /v1/toolsets` on the Hermes API server.
