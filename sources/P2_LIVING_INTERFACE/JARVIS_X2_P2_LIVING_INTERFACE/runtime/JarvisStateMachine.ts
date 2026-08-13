import type { JarvisState, RuntimeEvent } from "./contracts";

const transitions: Record<JarvisState, JarvisState[]> = {
  idle: ["wake","listening","warning"],
  wake: ["listening","idle","warning"],
  listening: ["understanding","idle","warning"],
  understanding: ["thinking","speaking","idle","warning"],
  thinking: ["acting","speaking","idle","warning"],
  acting: ["speaking","idle","warning"],
  speaking: ["idle","listening","warning"],
  warning: ["idle","listening"],
};

export function reduceJarvisState(current: JarvisState, event: RuntimeEvent): JarvisState {
  let next: JarvisState = current;

  switch(event.type){
    case "wake.detected": next = "wake"; break;
    case "voice.start": next = "listening"; break;
    case "voice.final": next = "understanding"; break;
    case "reasoning.start": next = "thinking"; break;
    case "action.requested": next = event.action.tier === "CRITICAL" ? "warning" : "thinking"; break;
    case "action.started": next = "acting"; break;
    case "action.completed": next = "speaking"; break;
    case "action.failed": next = "warning"; break;
    case "speech.start": next = "speaking"; break;
    case "speech.end": next = "idle"; break;
    case "warning": next = "warning"; break;
    case "reset": next = "idle"; break;
    default: return current;
  }

  if (next === current || transitions[current].includes(next)) return next;

  // Runtime events can arrive late/out-of-order. Reject unsafe visual jumps.
  if (event.type === "warning" || event.type === "reset") return next;
  return current;
}
