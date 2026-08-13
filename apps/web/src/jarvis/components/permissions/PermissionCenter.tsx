"use client";
import { useJarvisStore, setJarvisUiFlags } from "../../runtime/store/jarvisStore";
import { requestMicrophonePermission, stopMediaStream } from "../../runtime/audio/permission";

export function PermissionCenter(){
  const s=useJarvisStore();

  async function testMicrophone(){
    const stream=await requestMicrophonePermission();
    setJarvisUiFlags({micEnabled:true});
    setTimeout(()=>{stopMediaStream(stream);setJarvisUiFlags({micEnabled:false});},1000);
  }

  return <section className="jx2-permission-center">
    <div><span>Microphone</span><strong>{s.micEnabled?"active":"off"}</strong><button onClick={testMicrophone}>Test permission</button></div>
    <div><span>Wake word</span><strong>{s.wakeEnabled?"active":"off"}</strong></div>
    <div><span>Vision</span><strong>{s.visionEnabled?"active":"off"}</strong></div>
    <div><span>Runtime</span><strong>{s.connection}</strong></div>
  </section>
}
