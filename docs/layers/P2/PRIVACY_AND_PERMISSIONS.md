# Privacy & Permissions

## Default
- microphone OFF
- wake word OFF
- camera OFF
- no audio autoplay
- no cloud connection required

## Microphone
User explicitly enables hands-free mode.
Closing/disabling the mode stops all MediaStream tracks.

## Camera
Camera support is adapter-only in P2.
No continuous camera activation is enabled by default.

## Permission tiers

### READ
Search, inspect, summarize, read-only queries.

### ACT
Reversible changes such as creating drafts or local files.
Still policy checked.

### CRITICAL
Payments, deletion, public publishing, credentials, legal submission,
production mutation and sensitive physical security controls.
Requires explicit approval.

## Logs
Approval decisions may be stored locally in a short approval ledger.
Do not place secrets, full credentials, or raw microphone audio into the ledger.
