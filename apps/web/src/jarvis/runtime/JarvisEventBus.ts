import type { RuntimeEvent } from "./contracts";

type Listener = (event: RuntimeEvent) => void;

export class JarvisEventBus {
  private listeners = new Set<Listener>();

  emit(event: RuntimeEvent){
    for(const listener of this.listeners) listener(event);
  }

  subscribe(listener: Listener){
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const jarvisEventBus = new JarvisEventBus();
