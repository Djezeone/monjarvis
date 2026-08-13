"use client";

import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Float, Line } from "@react-three/drei";
import { useRef } from "react";

function Device({pos,kind}:{pos:[number,number,number];kind:"home"|"phone"|"computer"|"sensor"}){
  const g=useRef<THREE.Group>(null);
  useFrame((_,dt)=>{ if(g.current) g.current.rotation.y+=dt*.04; });
  return <group ref={g} position={pos}>
    <Float speed={.75} rotationIntensity={.04} floatIntensity={.16}>
      <mesh>
        {kind==="home" && <boxGeometry args={[1.1,.72,.86]}/>}
        {kind==="phone" && <boxGeometry args={[.34,.68,.06]}/>}
        {kind==="computer" && <boxGeometry args={[.9,.58,.08]}/>}
        {kind==="sensor" && <sphereGeometry args={[.15,20,20]}/>}
        <meshPhysicalMaterial color="#0E1721" metalness={.4} roughness={.28} clearcoat={1} emissive="#0B2630" emissiveIntensity={.18}/>
      </mesh>
    </Float>
  </group>
}
export function PhysicalWorld3D(){
  const devices=[
    {kind:"home" as const,pos:[0,0,0] as [number,number,number]},
    {kind:"phone" as const,pos:[-2,1.1,.2] as [number,number,number]},
    {kind:"computer" as const,pos:[2,1,.1] as [number,number,number]},
    {kind:"sensor" as const,pos:[-2,-1.2,-.2] as [number,number,number]},
    {kind:"sensor" as const,pos:[2.1,-1.3,.3] as [number,number,number]},
  ];
  return <div className="jx2-world">
    <Canvas dpr={[1,1.6]}>
      <PerspectiveCamera makeDefault position={[0,0,7.4]} fov={40}/>
      <ambientLight intensity={.18}/>
      <pointLight position={[0,4,4]} color="#5DEBFF" intensity={1.7}/>
      {devices.map((d,i)=><Device key={i} {...d}/>)}
      {devices.slice(1).map((d,i)=><Line key={`l-${i}`} points={[[0,0,0],d.pos]} color="#5DEBFF" opacity={.18} transparent lineWidth={.8}/>)}
    </Canvas>
  </div>
}
