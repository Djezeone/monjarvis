"use client";
import { useRef } from "react";

export function Magnetic({children,strength=12,className=""}:{
  children:React.ReactNode; strength?:number; className?:string;
}){
  const ref=useRef<HTMLDivElement>(null);
  return <div
    ref={ref}
    className={className}
    onPointerMove={(e)=>{
      const el=ref.current;if(!el)return;
      const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left-r.width/2)/r.width;
      const y=(e.clientY-r.top-r.height/2)/r.height;
      el.style.transform=`translate3d(${x*strength}px,${y*strength}px,0)`;
    }}
    onPointerLeave={()=>{ if(ref.current) ref.current.style.transform="translate3d(0,0,0)"; }}
    style={{transition:"transform 160ms cubic-bezier(.2,.8,.2,1)",willChange:"transform"}}
  >{children}</div>
}
