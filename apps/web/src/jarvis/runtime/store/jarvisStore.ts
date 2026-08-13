import { useSyncExternalStore } from "react";
import type { JarvisUiSnapshot, RuntimeEvent } from "../contracts";
import { reduceJarvisState } from "../JarvisStateMachine";
import { jarvisEventBus } from "../JarvisEventBus";

let snapshot: JarvisUiSnapshot = {
  state: "idle",
  connection: "offline",
  transcript: "",
  partialTranscript: "",
  wakePhrase: "Hey Jarvis",
  micEnabled: false,
  wakeEnabled: false,
  visionEnabled: false,
  activeAgentCount: 0,
};

const listeners = new Set<() => void>();

function publish(next: JarvisUiSnapshot){
  snapshot = next;
  for(const listener of listeners) listener();
}

export function dispatchJarvisEvent(event: RuntimeEvent){
  let next: JarvisUiSnapshot = {
    ...snapshot,
    state: reduceJarvisState(snapshot.state, event),
  };

  switch(event.type){
    case "runtime.connected":
      next.connection = event.mode;
      break;
    case "runtime.disconnected":
      next.connection = "offline";
      if(event.reason) next.lastError = event.reason;
      break;
    case "voice.partial":
      next.partialTranscript = event.text;
      break;
    case "voice.final":
      next.transcript = event.text;
      next.partialTranscript = "";
      break;
    case "action.requested":
      next.pendingApproval = event.action.tier === "CRITICAL" ? event.action : undefined;
      break;
    case "action.completed":
      next.pendingApproval = undefined;
      break;
    case "action.failed":
      next.lastError = event.error;
      break;
    case "warning":
      next.lastError = event.message;
      break;
    case "reset":
      next.partialTranscript = "";
      next.pendingApproval = undefined;
      next.lastError = undefined;
      break;
  }

  publish(next);
}

jarvisEventBus.subscribe(dispatchJarvisEvent);

export function setJarvisUiFlags(flags: Partial<Pick<JarvisUiSnapshot,
  "micEnabled"|"wakeEnabled"|"visionEnabled"|"activeAgentCount"|"wakePhrase">>){
  publish({...snapshot,...flags});
}

export function getJarvisSnapshot(){ return snapshot; }

export function useJarvisStore(){
  return useSyncExternalStore(
    (listener)=>{ listeners.add(listener); return ()=>listeners.delete(listener); },
    ()=>snapshot,
    ()=>snapshot
  );
}
