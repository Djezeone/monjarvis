import asyncio
import json
import os
import time
from typing import Set

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openwakeword.model import Model

HOST = os.getenv("JARVIS_HOST", "127.0.0.1")
PORT = int(os.getenv("JARVIS_PORT", "8765"))
WAKE_THRESHOLD = float(os.getenv("JARVIS_WAKE_THRESHOLD", "0.5"))
WAKE_KEY = os.getenv("JARVIS_WAKE_KEY", "jarvis").lower()
WAKE_COOLDOWN_SECONDS = float(os.getenv("JARVIS_WAKE_COOLDOWN", "2.0"))

app = FastAPI(title="JARVIS X2 Local Runtime", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Model() with no explicit path loads included/downloaded openWakeWord models.
# For commercial distribution, do NOT ship the included non-commercial models.
wake_model = Model(vad_threshold=0.35)
event_clients: Set[WebSocket] = set()

@app.get("/health")
async def health():
    return {
        "ok": True,
        "runtime": "local",
        "wake_threshold": WAKE_THRESHOLD,
        "wake_key": WAKE_KEY,
    }

async def broadcast(event: dict):
    stale = []
    payload = json.dumps(event)
    for ws in list(event_clients):
        try:
            await ws.send_text(payload)
        except Exception:
            stale.append(ws)
    for ws in stale:
        event_clients.discard(ws)

@app.websocket("/events")
async def events_socket(ws: WebSocket):
    await ws.accept()
    event_clients.add(ws)
    await ws.send_json({"type":"runtime.connected","mode":"local"})
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            # This P2 bridge is intentionally NOT the AI brain.
            # It only demonstrates the event contract.
            if msg.get("type") == "user.text":
                text = str(msg.get("text","")).strip()
                if text:
                    await ws.send_json({"type":"reasoning.start"})
                    await asyncio.sleep(0.05)
                    await ws.send_json({
                        "type":"speech.start",
                        "text":f"Received locally: {text}"
                    })
            elif msg.get("type") == "approval":
                await ws.send_json({
                    "type":"action.completed",
                    "actionId":str(msg.get("actionId","unknown")),
                    "summary":str(msg.get("decision",""))
                })
    except WebSocketDisconnect:
        pass
    finally:
        event_clients.discard(ws)

@app.websocket("/wake")
async def wake_socket(ws: WebSocket):
    await ws.accept()
    last_trigger = 0.0

    try:
        while True:
            data = await ws.receive_bytes()
            if not data:
                continue

            pcm = np.frombuffer(data, dtype=np.int16)
            if pcm.size == 0:
                continue

            predictions = wake_model.predict(pcm)
            matches = [
                (name, float(score))
                for name, score in predictions.items()
                if WAKE_KEY in str(name).lower()
            ]
            if not matches:
                continue

            phrase, score = max(matches, key=lambda x: x[1])
            now = time.monotonic()

            if score >= WAKE_THRESHOLD and (now - last_trigger) >= WAKE_COOLDOWN_SECONDS:
                last_trigger = now
                event = {
                    "type":"wake",
                    "phrase":phrase,
                    "score":score,
                    "at":time.time(),
                }
                await ws.send_json(event)
                await broadcast({
                    "type":"wake.detected",
                    "phrase":phrase,
                    "score":score
                })
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
