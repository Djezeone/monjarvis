#!/usr/bin/env bash
set -euo pipefail
docker compose -f docker-compose.memory.yml up -d
python -m uvicorn graphiti_service:app --host 127.0.0.1 --port 8771
