"use client";
import { motion } from "motion/react";

export function SectionTransition({label}:{label?:string}){
  return <motion.div
    className="jx2-section-transition"
    initial={{scaleX:0,opacity:0}}
    whileInView={{scaleX:1,opacity:1}}
    viewport={{once:false,amount:.6}}
    transition={{duration:.8,ease:[.2,.8,.2,1]}}
  >
    <i/><span>{label}</span><i/>
  </motion.div>
}
