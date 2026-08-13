"use client";
import { useEffect, useRef, useState } from "react";

export function usePointerVelocity(){
  const last = useRef({x:0,y:0,t:performance.now()});
  const [data,setData]=useState({x:.5,y:.5,velocity:0});
  useEffect(()=>{
    const move=(e:PointerEvent)=>{
      const now=performance.now();
      const dt=Math.max(8,now-last.current.t);
      const dx=e.clientX-last.current.x, dy=e.clientY-last.current.y;
      const v=Math.min(1,Math.hypot(dx,dy)/dt/1.4);
      last.current={x:e.clientX,y:e.clientY,t:now};
      setData({x:e.clientX/window.innerWidth,y:e.clientY/window.innerHeight,velocity:v});
    };
    window.addEventListener("pointermove",move,{passive:true});
    return()=>window.removeEventListener("pointermove",move);
  },[]);
  return data;
}
