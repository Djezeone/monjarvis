#!/usr/bin/env bash
# JARVIS X2 — Home Node launcher: wake runtime + headless voice loop + agent.
# Prérequis (une fois) :
#   python3 -m venv .venv && source .venv/bin/activate
#   pip install -r ../voice-runtime/requirements.txt -r requirements.txt
#   python ../voice-runtime/setup_openwakeword_models.py
#   cp config.example.json config.json   # éditer coreUrl + enrollmentCode
set -euo pipefail
cd "$(dirname "$0")"

trap 'kill 0' EXIT

( cd ../voice-runtime && python -m uvicorn server:app --host 127.0.0.1 --port 8765 ) &
sleep 2
python node_voice.py &
node ../device-agent/agent.mjs "$(pwd)/config.json"
