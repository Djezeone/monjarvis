import type { IntelligenceEvent } from "./contracts";
type Listener=(event:IntelligenceEvent)=>void;

export class IntelligenceBus {
  private listeners=new Set<Listener>();
  emit(event:IntelligenceEvent){ this.listeners.forEach(l=>l(event)); }
  subscribe(listener:Listener){ this.listeners.add(listener); return()=>this.listeners.delete(listener); }
}
export const intelligenceBus=new IntelligenceBus();
