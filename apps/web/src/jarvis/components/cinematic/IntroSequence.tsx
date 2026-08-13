"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const phases = [
  { key:"dark", ms:350 },
  { key:"signal", ms:650 },
  { key:"form", ms:1250 },
  { key:"name", ms:1150 },
  { key:"handoff", ms:850 },
] as const;

export function IntroSequence({
  onComplete,
  reducedMotion = false,
}: {
  onComplete?:()=>void;
  reducedMotion?:boolean;
}){
  const [phase,setPhase]=useState(0);

  useEffect(()=>{
    if(reducedMotion){ onComplete?.(); return; }
    let active=true, idx=0;
    const tick=()=>{
      if(!active) return;
      if(idx>=phases.length-1){ onComplete?.(); return; }
      setTimeout(()=>{ idx+=1; setPhase(idx); tick(); }, phases[idx].ms);
    };
    tick();
    return()=>{ active=false; };
  },[onComplete,reducedMotion]);

  if(reducedMotion) return null;

  return (
    <AnimatePresence>
      {phase < phases.length && (
        <motion.div
          className={`jx2-intro phase-${phases[phase].key}`}
          initial={{opacity:1}}
          exit={{opacity:0, transition:{duration:.7}}}
        >
          <div className="jx2-intro-noise"/>
          <motion.div
            className="jx2-intro-signal"
            animate={{
              scale:[.65,1.08,1],
              opacity:[0,.9,.55],
              filter:["blur(18px)","blur(1px)","blur(5px)"]
            }}
            transition={{duration:2.0,ease:[.18,.8,.22,1]}}
          />
          {phase>=2 && <div className="jx2-intro-core"/>}
          {phase>=3 && (
            <motion.div
              className="jx2-intro-title"
              initial={{opacity:0,y:14}}
              animate={{opacity:1,y:0}}
              transition={{duration:.65}}
            >
              <span>JARVIS X2</span>
              <small>PERSONAL AGENT OS</small>
            </motion.div>
          )}
          <button className="jx2-intro-skip" onClick={onComplete}>Skip</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
