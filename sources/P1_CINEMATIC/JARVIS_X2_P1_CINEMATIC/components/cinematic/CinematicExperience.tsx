"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IntroSequence } from "./IntroSequence";
import { ScrollDirector, useCinematicDirector } from "./ScrollDirector";
import { MemoryWorld3D } from "../worlds/MemoryWorld3D";
import { PhysicalWorld3D } from "../worlds/PhysicalWorld3D";
import { SectionTransition } from "../transitions/SectionTransition";

function ExperienceBody(){
  const {heroOpacity,coreScale,memoryMix,physicalMix}=useCinematicDirector();
  return <>
    <section className="jx2-cine-hero">
      <motion.div className="jx2-cine-orb" style={{scale:coreScale,opacity:heroOpacity}}/>
      <motion.div className="jx2-cine-copy" style={{opacity:heroOpacity}}>
        <span>PERSONAL AGENT OS</span>
        <h1>Presence,<br/>not interface.</h1>
        <p>One intelligence that remembers context, understands intent and acts across your digital and physical world.</p>
      </motion.div>
      <div className="jx2-cine-scroll">SCROLL TO ENTER</div>
    </section>

    <section className="jx2-cine-chapter">
      <SectionTransition label="01 — MEMORY"/>
      <motion.div className="jx2-world-wrap" style={{opacity:memoryMix}}><MemoryWorld3D/></motion.div>
      <div className="jx2-chapter-copy"><h2>Memory with history.</h2><p>Facts change. Relationships evolve. Context remains traceable.</p></div>
    </section>

    <section className="jx2-cine-chapter">
      <SectionTransition label="02 — ACTION"/>
      <div className="jx2-chapter-copy"><h2>Intent becomes verified action.</h2><p>Observe. Reason. Delegate. Execute. Confirm.</p></div>
    </section>

    <section className="jx2-cine-chapter">
      <SectionTransition label="03 — PHYSICAL WORLD"/>
      <motion.div className="jx2-world-wrap" style={{opacity:physicalMix}}><PhysicalWorld3D/></motion.div>
      <div className="jx2-chapter-copy"><h2>Digital intelligence, physical reach.</h2><p>Devices, rooms, sensors and services become one controllable context.</p></div>
    </section>

    <section className="jx2-cine-end">
      <h2>Welcome to JARVIS X2.</h2>
      <a href="/app">Enter the system</a>
    </section>
  </>;
}

export function CinematicExperience(){
  const reduced=useReducedMotion();
  const [intro,setIntro]=useState(true);
  useEffect(()=>{ if(reduced) setIntro(false); },[reduced]);

  return <main className="jx2-cinematic-root">
    {intro && <IntroSequence reducedMotion={!!reduced} onComplete={()=>setIntro(false)}/>}
    <ScrollDirector><ExperienceBody/></ScrollDirector>
  </main>
}
