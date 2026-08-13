"use client";
import { usePointerVelocity } from "./usePointerVelocity";

export function CursorField(){
  const p=usePointerVelocity();
  return (
    <div
      className="jx-cursor-field"
      style={{
        ["--jx-x" as any]:`${p.x*100}%`,
        ["--jx-y" as any]:`${p.y*100}%`,
        ["--jx-v" as any]:p.velocity,
      }}
      aria-hidden="true"
    />
  );
}
