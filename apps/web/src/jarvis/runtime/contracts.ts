export type JarvisState =
  | "idle"
  | "wake"
  | "listening"
  | "understanding"
  | "thinking"
  | "acting"
  | "speaking"
  | "warning";

export type RuntimeConnection = "offline" | "connecting" | "local" | "cloud" | "degraded";

export type PermissionTier = "READ" | "ACT" | "CRITICAL";

export type RuntimeEvent =
  | { type: "runtime.connected"; mode: "local" | "cloud" }
  | { type: "runtime.disconnected"; reason?: string }
  | { type: "wake.detected"; score?: number; phrase?: string }
  | { type: "voice.start" }
  | { type: "voice.partial"; text: string }
  | { type: "voice.final"; text: string }
  | { type: "reasoning.start" }
  | { type: "action.requested"; action: ActionRequest }
  | { type: "action.started"; actionId: string }
  | { type: "action.completed"; actionId: string; summary?: string }
  | { type: "action.failed"; actionId: string; error: string }
  | { type: "speech.start"; text?: string }
  | { type: "speech.end" }
  | { type: "warning"; message: string }
  | { type: "reset" };

export type ActionRequest = {
  id: string;
  title: string;
  description?: string;
  tier: PermissionTier;
  reversible: boolean;
  target?: string;
  dataAffected?: string[];
  requestedBy?: string;
  createdAt: string;
};

export type JarvisUiSnapshot = {
  state: JarvisState;
  connection: RuntimeConnection;
  transcript: string;
  partialTranscript: string;
  wakePhrase: string;
  micEnabled: boolean;
  wakeEnabled: boolean;
  visionEnabled: boolean;
  activeAgentCount: number;
  pendingApproval?: ActionRequest;
  lastError?: string;
};
