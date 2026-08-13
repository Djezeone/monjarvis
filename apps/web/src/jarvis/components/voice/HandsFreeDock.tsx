"use client";

import type { JarvisState } from "../../config/states";
import { SpeechWaveform } from "./SpeechWaveform";

const labels: Record<JarvisState,string> = {
  idle:"Available",
  wake:"Awake",
  listening:"Listening",
  understanding:"Understanding",
  thinking:"Thinking",
  acting:"Acting",
  speaking:"Speaking",
  warning:"Attention required",
};

export function HandsFreeDock({
  state="idle",
  wakePhrase="Hey Jarvis",
  transcript,
  onToggle,
}: {
  state?: JarvisState;
  wakePhrase?: string;
  transcript?: string;
  onToggle?: ()=>void;
}) {
  const active = !["idle","warning"].includes(state);
  return (
    <aside className={`jx-handsfree is-${state}`}>
      <button onClick={onToggle} className="jx-mic" aria-label="Toggle hands-free mode">
        <span className="jx-mic-dot"/>
      </button>
      <div className="jx-handsfree-copy">
        <strong>{labels[state]}</strong>
        <span>{transcript || (state === "idle" ? `Say “${wakePhrase}”` : "Voice channel active")}</span>
      </div>
      <SpeechWaveform active={active} level={state==="speaking" ? .85 : .6}/>
      <div className="jx-private">LOCAL • PRIVATE</div>
    </aside>
  );
}
