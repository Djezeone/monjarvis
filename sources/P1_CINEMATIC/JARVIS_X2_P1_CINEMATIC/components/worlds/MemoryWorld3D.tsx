"use client";

import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";

type MNode={id:string;kind:"person"|"project"|"place"|"doc"|"event";pos:[number,number,number];label:string};
const colors={person:"#5DEBFF",project:"#7867FF",place:"#63E6A5",doc:"#8EA1B4",event:"#D5A85A"};

function World(){
  const group=useRef<THREE.Group>(null);
  const nodes:MNode[]=useMemo(()=>[
    {id:"you",kind:"person",pos:[0,0,0],label:"You"},
    {id:"jx2",kind:"project",pos:[1.8,.8,-.6],label:"JARVIS X2"},
    {id:"home",kind:"place",pos:[-1.8,-.6,.2],label:"Home"},
    {id:"doc",kind:"doc",pos:[-1.3,1.4,-1],label:"Research"},
    {id:"today",kind:"event",pos:[1.2,-1.5,.5],label:"Today"},
    {id:"decision",kind:"event",pos:[2.5,-.2,-1.2],label:"Decision"},
  ],[]);
  useFrame((_,dt)=>{ if(group.current) group.current.rotation.y+=dt*.025; });
  return <group ref={group}>
    {nodes.slice(1).map(n=><Line key={`l-${n.id}`} points={[[0,0,0],n.pos]} color={colors[n.kind]} transparent opacity={.24} lineWidth={.8}/>)}
    {nodes.map(n=><group key={n.id} position={n.pos}>
      <mesh>
        <sphereGeometry args={[n.id==="you"?.13:.08,24,24]}/>
        <meshBasicMaterial color={colors[n.kind]} transparent opacity={.9}/>
      </mesh>
      <pointLight color={colors[n.kind]} intensity={n.id==="you"?.7:.28} distance={2.2}/>
    </group>)}
    <Sparkles count={140} scale={7} size={.8} speed={.1} opacity={.34} color="#5DEBFF"/>
  </group>
}

export function MemoryWorld3D(){
  return <div className="jx2-world">
    <Canvas dpr={[1,1.6]}>
      <PerspectiveCamera makeDefault position={[0,0,6]} fov={42}/>
      <fog attach="fog" args={["#05070A",4,10]}/>
      <World/>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={.12}/>
    </Canvas>
  </div>
}
