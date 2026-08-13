export type IntelligenceMode = "local" | "hybrid" | "cloud";
export type RunStatus = "queued" | "started" | "running" | "waiting_approval" | "stopping" | "completed" | "failed" | "cancelled";

export type AgentRun = {
  runId: string;
  sessionId?: string;
  status: RunStatus;
  input: string;
  output?: string;
  startedAt: string;
  finishedAt?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type ToolProgress = {
  runId: string;
  tool?: string;
  phase: "started" | "completed" | "failed" | "progress";
  summary?: string;
  at: string;
};

export type DelegationEvent = {
  runId: string;
  childSessionId?: string;
  status: "started" | "completed" | "failed" | "timeout";
  summary?: string;
  durationMs?: number;
  tokens?: number;
  cost?: number;
  at: string;
};

export type ApprovalRequest = {
  runId: string;
  approvalId?: string;
  title: string;
  description?: string;
  tool?: string;
  argumentsPreview?: unknown;
  risk?: "ACT" | "CRITICAL";
};

export type IntelligenceEvent =
  | { type: "run.started"; run: AgentRun }
  | { type: "run.delta"; runId: string; text: string }
  | { type: "run.status"; runId: string; status: RunStatus }
  | { type: "run.completed"; run: AgentRun }
  | { type: "run.failed"; runId: string; error: string }
  | { type: "tool.progress"; progress: ToolProgress }
  | { type: "delegation"; delegation: DelegationEvent }
  | { type: "approval.required"; approval: ApprovalRequest }
  | { type: "memory.updated"; episodeId?: string }
  | { type: "warning"; message: string };

export type RunInput = {
  input: string;
  sessionId?: string;
  sessionKey?: string;
  instructions?: string;
  previousResponseId?: string;
  model?: string;
  provider?: string;
  reasoningEffort?: string;
};

export interface IntelligenceAdapter {
  readonly id: string;
  health(): Promise<boolean>;
  capabilities(): Promise<Record<string, unknown>>;
  startRun(input: RunInput): Promise<AgentRun>;
  getRun(runId: string): Promise<AgentRun>;
  stopRun(runId: string): Promise<void>;
  approveRun(runId: string, decision: "approve" | "deny", approvalId?: string): Promise<void>;
  streamRun(runId: string, onEvent: (event: IntelligenceEvent) => void): () => void;
}
