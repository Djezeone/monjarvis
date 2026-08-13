import { jarvisEventBus } from "../JarvisEventBus";

export class WhisperCppAdapter {
  readonly id = "whisper.cpp";
  constructor(
    private endpoint = "http://127.0.0.1:8080/inference",
    private language = "auto"
  ){}

  async transcribe(audio: Blob){
    jarvisEventBus.emit({type:"voice.start"});
    const form = new FormData();
    form.append("file", audio, audio.type.includes("wav") ? "turn.wav" : "turn.webm");
    form.append("response_format","json");
    form.append("language",this.language);
    form.append("temperature","0.0");

    const res = await fetch(this.endpoint,{method:"POST",body:form});
    if(!res.ok) throw new Error(`whisper.cpp ${res.status}`);
    const data = await res.json();
    const text = String(data.text ?? data.transcription ?? "").trim();
    jarvisEventBus.emit({type:"voice.final",text});
    return text;
  }
}
