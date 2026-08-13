import type { VisionAdapter, VisionFrame } from "./VisionAdapter";

export class CameraFrameAdapter implements VisionAdapter {
  readonly id="browser-camera";
  private stream?:MediaStream;
  private video?:HTMLVideoElement;

  async enable(){
    this.stream=await navigator.mediaDevices.getUserMedia({
      video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"},
      audio:false
    });
    this.video=document.createElement("video");
    this.video.srcObject=this.stream;
    this.video.muted=true;
    this.video.playsInline=true;
    await this.video.play();
  }

  async disable(){
    this.stream?.getTracks().forEach(t=>t.stop());
    this.video?.pause();
    this.video=undefined;this.stream=undefined;
  }

  async capture():Promise<VisionFrame|null>{
    if(!this.video || this.video.readyState<2) return null;
    return {bitmap:await createImageBitmap(this.video),at:Date.now()};
  }
}
