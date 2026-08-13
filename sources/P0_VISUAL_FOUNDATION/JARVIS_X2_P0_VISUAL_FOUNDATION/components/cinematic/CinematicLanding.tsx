"use client";
import { useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { JarvisCoreScene } from "../jarvis-core/JarvisCoreScene";
import { CursorField } from "../cursor/CursorField";
import { Magnetic } from "../cursor/Magnetic";

export function CinematicLanding(){
  const {scrollYProgress}=useScroll();
  const scale=useTransform(scrollYProgress,[0,.35],[1,1.22]);
  const opacity=useTransform(scrollYProgress,[0,.26,.44],[1,.92,0]);
  const [pointer,setPointer]=useState(0);

  return <main className="jx-cinematic">
    <CursorField/>
    <section className="jx-hero" onPointerMove={()=>setPointer(.85)} onPointerLeave={()=>setPointer(0)}>
      <motion.div className="jx-core-wrap" style={{scale,opacity}}>
        <JarvisCoreScene state="listening" pointerInfluence={pointer} className="jx-core-canvas"/>
      </motion.div>
      <div className="jx-hero-copy">
        <span className="jx-kicker">PERSONAL AGENT OS</span>
        <h1>Less interface.<br/>More presence.</h1>
        <p>An AI that listens, remembers, acts and stays available across your digital and physical world.</p>
        <Magnetic className="jx-cta"><button>Meet Jarvis</button></Magnetic>
      </div>
      <div className="jx-scroll-cue">SCROLL TO ENTER</div>
    </section>
    <section className="jx-story"><span>01 / MEMORY</span><h2>It remembers context, not just messages.</h2></section>
    <section className="jx-story"><span>02 / PERCEPTION</span><h2>Voice, screen, browser, environment.</h2></section>
    <section className="jx-story"><span>03 / ACTION</span><h2>From intent to verified execution.</h2></section>
  </main>
}
