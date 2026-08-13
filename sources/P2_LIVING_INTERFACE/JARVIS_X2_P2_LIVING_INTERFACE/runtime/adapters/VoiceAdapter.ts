import type { RuntimeEvent } from "../contracts";

export type VoiceAdapterEvents = {
  emit(event: RuntimeEvent): void;
};

export interface VoiceAdapter {
  readonly id: string;
  enable(): Promise<void>;
  disable(): Promise<void>;
  startTurn?(): Promise<void>;
  stopTurn?(): Promise<void>;
  speak?(text: string): Promise<void>;
  mute?(): void;
  unmute?(): void;
}
