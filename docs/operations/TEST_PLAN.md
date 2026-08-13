# Test Plan

## Unit
- state machine ;
- policy classification ;
- memory write/search adapters ;
- asset registry ;
- event sanitization.

## Integration
- voice → STT → Hermes ;
- Hermes → memory ;
- Hermes → subagent ;
- Hermes → approval ;
- n8n allowlist ;
- Home Assistant read ;
- Browser Worker denied by default.

## E2E
1. typed request simple ;
2. voice request simple ;
3. memory recall ;
4. subagent research ;
5. action ACT ;
6. action CRITICAL reject ;
7. action CRITICAL approve ;
8. local service failure ;
9. no-WebGL fallback ;
10. mobile / reduced-motion.

## Performance
- Core scene ;
- cinematic scroll ;
- memory world ;
- background-tab pause ;
- first viewport payload.
