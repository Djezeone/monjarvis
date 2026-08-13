"use client";

import { useScroll, useTransform, motion, MotionValue } from "motion/react";
import { createContext, useContext } from "react";

type DirectorContextValue = {
  progress: MotionValue<number>;
  heroOpacity: MotionValue<number>;
  coreScale: MotionValue<number>;
  memoryMix: MotionValue<number>;
  physicalMix: MotionValue<number>;
};
const DirectorContext = createContext<DirectorContextValue | null>(null);

export function useCinematicDirector(){
  const v=useContext(DirectorContext);
  if(!v) throw new Error("useCinematicDirector must be used inside ScrollDirector");
  return v;
}

export function ScrollDirector({children}:{children:React.ReactNode}){
  const {scrollYProgress:progress}=useScroll();
  const heroOpacity=useTransform(progress,[0,.18,.3],[1,.82,0]);
  const coreScale=useTransform(progress,[0,.3,.5],[1,1.32,.86]);
  const memoryMix=useTransform(progress,[.22,.36,.56],[0,1,0]);
  const physicalMix=useTransform(progress,[.70,.84,.98],[0,1,0]);

  return <DirectorContext.Provider value={{progress,heroOpacity,coreScale,memoryMix,physicalMix}}>
    <motion.div className="jx2-director">{children}</motion.div>
  </DirectorContext.Provider>
}
