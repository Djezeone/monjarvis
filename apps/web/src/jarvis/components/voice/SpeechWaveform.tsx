"use client";
import { useEffect, useMemo, useState } from "react";

export function SpeechWaveform({
  active = false,
  bars = 28,
  level = .55,
}: { active?: boolean; bars?: number; level?: number }) {
  const seed = useMemo(() => Array.from({length:bars}, (_,i) => .25 + ((i*17)%13)/18), [bars]);
  const [tick,setTick] = useState(0);
  useEffect(() => {
    if(!active) return;
    const id = setInterval(()=>setTick(v=>v+1), 90);
    return ()=>clearInterval(id);
  },[active]);

  return (
    <div className="jx-wave" aria-hidden="true">
      {seed.map((v,i)=>{
        const dynamic = active ? (.35 + Math.abs(Math.sin((tick+i)*.72))*.65) : .2;
        return <i key={i} style={{ height: `${6 + 28*v*dynamic*level}px` }}/>;
      })}
    </div>
  );
}
