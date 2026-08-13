export async function requestMicrophonePermission(){
  if(!navigator.mediaDevices?.getUserMedia){
    throw new Error("Microphone capture is not supported by this browser.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    }
  });
  return stream;
}

export function stopMediaStream(stream?: MediaStream | null){
  stream?.getTracks().forEach(track=>track.stop());
}
