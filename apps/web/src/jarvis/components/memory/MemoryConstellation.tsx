"use client";
import { useMemo } from "react";

type Node = { id:string; label:string; kind:"person"|"project"|"place"|"doc"|"event"; x:number; y:number };
const colors = {person:"#5DEBFF",project:"#7867FF",place:"#63E6A5",doc:"#8EA1B4",event:"#D5A85A"};

export function MemoryConstellation({nodes}:{nodes?:Node[]}){
  const data=useMemo<Node[]>(()=>nodes ?? [
    {id:"1",label:"You",kind:"person",x:50,y:48},
    {id:"2",label:"Jarvis X2",kind:"project",x:70,y:32},
    {id:"3",label:"Research",kind:"doc",x:25,y:28},
    {id:"4",label:"Home",kind:"place",x:30,y:68},
    {id:"5",label:"Today",kind:"event",x:72,y:70},
  ],[nodes]);
  const center=data[0];
  return <div className="jx-memory-map">
    <svg viewBox="0 0 100 100" role="img" aria-label="Memory constellation">
      {data.slice(1).map(n=><line key={`l-${n.id}`} x1={center.x} y1={center.y} x2={n.x} y2={n.y} stroke={colors[n.kind]} strokeOpacity=".22" strokeWidth=".35"/>)}
      {data.map(n=><g key={n.id}>
        <circle cx={n.x} cy={n.y} r={n.id==="1" ? 3.2 : 2} fill={colors[n.kind]} fillOpacity=".18" stroke={colors[n.kind]} strokeWidth=".5"/>
        <text x={n.x+3.2} y={n.y+.8} fontSize="3.4" fill="#DCEFFF" opacity=".82">{n.label}</text>
      </g>)}
    </svg>
  </div>
}
