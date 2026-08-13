"""
Development/personal-use helper.

IMPORTANT:
openWakeWord repository code is Apache-2.0, but the included pretrained wake-word
models are CC BY-NC-SA 4.0. Do not bundle those models into a commercial product
without resolving licensing. Train a custom model or swap wake engines instead.
"""
import openwakeword

if __name__ == "__main__":
    openwakeword.utils.download_models()
    print("Downloaded openWakeWord pretrained models for local development.")
