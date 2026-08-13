"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { LocalRuntimeWebSocketAdapter } from "./adapters/LocalRuntimeWebSocketAdapter";
import type { RuntimeAdapter } from "./adapters/RuntimeAdapter";
import { jarvisEventBus } from "./JarvisEventBus";

/**
 * Application-shell runtime singleton (P2 integration contract):
 * one adapter instance for the whole app, connected only after an explicit
 * user choice, its events piped into jarvisEventBus, injected via context.
 * Components must never open their own WebSocket to the local runtime.
 */

interface JarvisRuntimeContextValue {
  adapter: RuntimeAdapter;
  connected: boolean;
  connecting: boolean;
  /** Explicit user opt-in. Returns true when the runtime accepted the connection. */
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
}

const JarvisRuntimeContext = createContext<JarvisRuntimeContextValue | null>(null);

export function JarvisRuntimeProvider({ children }: { children: React.ReactNode }) {
  const adapterRef = useRef<RuntimeAdapter | null>(null);
  if (adapterRef.current === null) {
    adapterRef.current = new LocalRuntimeWebSocketAdapter();
  }
  const adapter = adapterRef.current;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const off = adapter.onEvent((event) => {
      jarvisEventBus.emit(event);
      if (event.type === "runtime.connected") setConnected(true);
      if (event.type === "runtime.disconnected") setConnected(false);
    });
    return () => {
      off();
    };
  }, [adapter]);

  const connect = useCallback(async () => {
    if (connected || connecting) return connected;
    setConnecting(true);
    try {
      await adapter.connect();
      return true;
    } catch {
      jarvisEventBus.emit({
        type: "warning",
        message: "Local runtime unavailable — start services/voice-runtime on port 8765.",
      });
      return false;
    } finally {
      setConnecting(false);
    }
  }, [adapter, connected, connecting]);

  const disconnect = useCallback(async () => {
    await adapter.disconnect();
  }, [adapter]);

  return (
    <JarvisRuntimeContext.Provider
      value={{ adapter, connected, connecting, connect, disconnect }}
    >
      {children}
    </JarvisRuntimeContext.Provider>
  );
}

export function useJarvisRuntime(): JarvisRuntimeContextValue {
  const ctx = useContext(JarvisRuntimeContext);
  if (!ctx) {
    throw new Error("useJarvisRuntime must be used within JarvisRuntimeProvider");
  }
  return ctx;
}
