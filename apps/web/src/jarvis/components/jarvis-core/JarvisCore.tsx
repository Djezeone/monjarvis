"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { jarvisStateConfig, type JarvisState } from "../../config/states";
import vertexShader from "../../shaders/core.vert.glsl";
import fragmentShader from "../../shaders/core.frag.glsl";

type Props = {
  state?: JarvisState;
  pointerInfluence?: number;
};

export function JarvisCore({ state = "idle", pointerInfluence = 0 }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const cfg = jarvisStateConfig[state];

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uEnergy: { value: cfg.energy },
    uPulse: { value: cfg.pulse },
    uPointer: { value: pointerInfluence },
    uCyan: { value: new THREE.Color("#5DEBFF") },
    uViolet: { value: new THREE.Color("#7867FF") },
    uGold: { value: new THREE.Color("#D5A85A") },
  }), []);

  useFrame((_, dt) => {
    uniforms.uTime.value += dt * cfg.speed;
    uniforms.uEnergy.value = THREE.MathUtils.lerp(uniforms.uEnergy.value, cfg.energy, .05);
    uniforms.uPulse.value = THREE.MathUtils.lerp(uniforms.uPulse.value, cfg.pulse, .05);
    uniforms.uPointer.value = THREE.MathUtils.lerp(uniforms.uPointer.value, pointerInfluence, .08);
    if (mesh.current) mesh.current.rotation.y += dt * .045 * cfg.speed;
    if (ringA.current) ringA.current.rotation.z += dt * .12;
    if (ringB.current) ringB.current.rotation.x -= dt * .075;
  });

  return (
    <group>
      <Float speed={1.1} rotationIntensity={.12} floatIntensity={.32}>
        <mesh ref={mesh}>
          <icosahedronGeometry args={[1.15, 8]} />
          <shaderMaterial
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={uniforms}
          />
        </mesh>

        <mesh ref={ringA} rotation={[Math.PI/2,0,0]}>
          <torusGeometry args={[1.48,.008,8,180]} />
          <meshBasicMaterial color="#5DEBFF" transparent opacity={.42}/>
        </mesh>
        <mesh ref={ringB} rotation={[0,Math.PI/4,Math.PI/4]}>
          <torusGeometry args={[1.70,.004,8,180]} />
          <meshBasicMaterial color="#7867FF" transparent opacity={.22}/>
        </mesh>
      </Float>

      <Sparkles
        count={state === "thinking" || state === "acting" ? 180 : 90}
        scale={4.6}
        size={1.25}
        speed={.18 + cfg.speed*.08}
        color="#5DEBFF"
        opacity={.55}
      />
    </group>
  );
}
