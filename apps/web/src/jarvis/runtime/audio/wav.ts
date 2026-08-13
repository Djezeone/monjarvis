export function encodeMonoWav(samples: Float32Array, sampleRate: number){
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset:number, text:string)=>{
    for(let i=0;i<text.length;i++) view.setUint8(offset+i,text.charCodeAt(i));
  };
  write(0,"RIFF");
  view.setUint32(4,36+samples.length*2,true);
  write(8,"WAVE"); write(12,"fmt ");
  view.setUint32(16,16,true);
  view.setUint16(20,1,true);
  view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true);
  view.setUint16(34,16,true);
  write(36,"data");
  view.setUint32(40,samples.length*2,true);
  let o=44;
  for(const raw of samples){
    const s=Math.max(-1,Math.min(1,raw));
    view.setInt16(o,s<0?s*0x8000:s*0x7fff,true);
    o+=2;
  }
  return new Blob([buffer],{type:"audio/wav"});
}
