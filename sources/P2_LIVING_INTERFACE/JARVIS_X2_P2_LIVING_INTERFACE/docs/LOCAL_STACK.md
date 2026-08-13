# Free / Local Voice Stack

## 1. openWakeWord — wake word
For development/personal use:

```bash
cd local-runtime
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python setup_openwakeword_models.py
python -m uvicorn server:app --host 127.0.0.1 --port 8765
```

Browser streams **16-bit 16 kHz PCM** in ~80 ms frames to `/wake`.

### Licensing
openWakeWord code: Apache-2.0.
Bundled pretrained models: CC BY-NC-SA 4.0.
Treat the pretrained `hey jarvis` model as personal/dev only if the product may become commercial.
For commercial distribution, train a custom wake model using appropriately licensed training data or switch engines.

## 2. whisper.cpp — STT
Build whisper.cpp and run `whisper-server` locally.

Recommended browser-compatible mode:

```bash
whisper-server \
  -m /path/to/model.bin \
  --host 127.0.0.1 \
  --port 8080 \
  --convert
```

`--convert` requires ffmpeg and allows MediaRecorder WebM/Opus uploads.
The P2 adapter POSTs multipart audio to:

```text
http://127.0.0.1:8080/inference
```

For a no-ffmpeg path, record/encode WAV before POSTing.

## 3. Piper — local TTS

```bash
pip install "piper-tts[http]"
python -m piper.download_voices <VOICE>
python -m piper.http_server -m <VOICE> --host 127.0.0.1 --port 5000
```

P2 sends JSON `{ "text": "..." }` to `/synthesize`.

### Licensing
Current Piper repository is GPL-3.0-or-later. Keep it as a replaceable local service
and review distribution obligations before bundling it into a commercial installer.

## 4. Cloud remains optional
LiveKit Agents can later replace or complement the local media pipeline for
cross-device realtime voice. It is not required for the P2 local proof-of-concept.
