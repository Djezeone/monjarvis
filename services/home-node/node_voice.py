#!/usr/bin/env python3
"""JARVIS X2 — Home Node headless voice loop (P4 brick 4).

Runs on a small always-on node (Raspberry Pi class). No LLM here — the node
only does: microphone capture → wake word (via the local voice-runtime) →
short turn recording with end-of-turn detection → STT (whisper.cpp) →
publish {type: "voice.final", text} on the local event bus, where the device
agent bridge forwards it to the Core and speaks the answer.

Pipeline:
  mic (sounddevice, 16 kHz mono int16)
    → ws://127.0.0.1:8765/wake      (openWakeWord in services/voice-runtime)
    → on wake: record turn (RMS end-of-turn, max duration)
    → POST WAV to whisper.cpp /inference
    → ws://127.0.0.1:8765/events    {type: "voice.final", text}

Environment:
  JARVIS_RUNTIME_WS   default ws://127.0.0.1:8765
  WHISPER_URL         default http://127.0.0.1:8080/inference
  TURN_MAX_SECONDS    default 8
  TURN_SILENCE_SECONDS default 0.8
  TURN_SILENCE_RMS    default 0.012
"""

import asyncio
import io
import json
import os
import wave

import numpy as np
import sounddevice as sd
import websockets

try:
    import requests
except ImportError:  # pragma: no cover - guidance for node installs
    raise SystemExit("pip install -r requirements.txt (requests manquant)")

RUNTIME_WS = os.getenv("JARVIS_RUNTIME_WS", "ws://127.0.0.1:8765")
WHISPER_URL = os.getenv("WHISPER_URL", "http://127.0.0.1:8080/inference")
SAMPLE_RATE = 16_000
FRAME_MS = 80
TURN_MAX_SECONDS = float(os.getenv("TURN_MAX_SECONDS", "8"))
TURN_SILENCE_SECONDS = float(os.getenv("TURN_SILENCE_SECONDS", "0.8"))
TURN_SILENCE_RMS = float(os.getenv("TURN_SILENCE_RMS", "0.012"))


def record_turn() -> bytes:
    """Record one user turn: stop after sustained silence or max duration."""
    frames: list[np.ndarray] = []
    silent_for = 0.0
    frame_len = int(SAMPLE_RATE * FRAME_MS / 1000)
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=frame_len) as stream:
        total = 0.0
        while total < TURN_MAX_SECONDS:
            block, _ = stream.read(frame_len)
            frames.append(block.copy())
            total += FRAME_MS / 1000
            rms = float(np.sqrt(np.mean((block.astype(np.float32) / 32768.0) ** 2)))
            silent_for = silent_for + FRAME_MS / 1000 if rms < TURN_SILENCE_RMS else 0.0
            if silent_for >= TURN_SILENCE_SECONDS and total > 1.0:
                break
    pcm = np.concatenate(frames)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


def transcribe(wav_bytes: bytes) -> str:
    r = requests.post(
        WHISPER_URL,
        files={"file": ("turn.wav", wav_bytes, "audio/wav")},
        data={"response_format": "json"},
        timeout=60,
    )
    r.raise_for_status()
    return str(r.json().get("text", "")).strip()


async def publish_final(text: str) -> None:
    async with websockets.connect(f"{RUNTIME_WS}/events") as ws:
        await ws.send(json.dumps({"type": "voice.final", "text": text}))


async def main() -> None:
    frame_len = int(SAMPLE_RATE * FRAME_MS / 1000)
    print(f"[node-voice] wake via {RUNTIME_WS}/wake, whisper at {WHISPER_URL}")
    while True:
        try:
            async with websockets.connect(f"{RUNTIME_WS}/wake") as wake_ws:
                with sd.InputStream(
                    samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=frame_len
                ) as stream:
                    while True:
                        block, _ = stream.read(frame_len)
                        await wake_ws.send(block.tobytes())
                        try:
                            raw = await asyncio.wait_for(wake_ws.recv(), timeout=0.001)
                        except asyncio.TimeoutError:
                            continue
                        event = json.loads(raw)
                        if event.get("type") in ("wake", "wake.detected"):
                            print("[node-voice] wake détecté — enregistrement du tour")
                            break
            wav = await asyncio.to_thread(record_turn)
            text = await asyncio.to_thread(transcribe, wav)
            if text:
                print(f"[node-voice] transcript: {text!r}")
                await publish_final(text)
            else:
                print("[node-voice] tour vide — retour à l'écoute")
        except Exception as e:  # keep the node alive; report honestly
            print(f"[node-voice] erreur: {e} — nouvelle tentative dans 3 s")
            await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(main())
