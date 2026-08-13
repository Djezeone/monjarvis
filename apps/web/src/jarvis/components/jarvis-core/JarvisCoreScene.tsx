"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { JarvisCore } from "./JarvisCore";
import type { JarvisState } from "../../config/states";

export function JarvisCoreScene({
  state = "idle",
  pointerInfluence = 0,
  className = "",
}: {
  state?: JarvisState;
  pointerInfluence?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-label={`JARVIS state: ${state}`}>
      <Canvas dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0,0,4.5]} fov={38}/>
        <ambientLight intensity={.18}/>
        <pointLight position={[3,3,5]} intensity={2.4} color="#5DEBFF"/>
        <pointLight position={[-4,-2,3]} intensity={1.2} color="#7867FF"/>
        <Suspense fallback={null}>
          <JarvisCore state={state} pointerInfluence={pointerInfluence}/>
          <Environment preset="night"/>
        </Suspense>
      </Canvas>
    </div>
  );
}
