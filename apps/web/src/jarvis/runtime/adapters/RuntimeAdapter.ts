import type { ActionRequest, RuntimeEvent } from "../contracts";

export interface RuntimeAdapter {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendUserText(text: string): Promise<void>;
  approveAction?(action: ActionRequest): Promise<void>;
  denyAction?(action: ActionRequest): Promise<void>;
  onEvent(listener: (event: RuntimeEvent)=>void): () => void;
}
