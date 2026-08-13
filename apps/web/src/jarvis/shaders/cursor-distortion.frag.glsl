
uniform sampler2D uTexture;
uniform vec2 uPointer;
uniform vec2 uResolution;
uniform float uVelocity;
varying vec2 vUv;

void main(){
  vec2 p = vUv - uPointer;
  p.x *= uResolution.x/uResolution.y;
  float d = length(p);
  float influence = smoothstep(.32,0.0,d);
  vec2 offset = normalize(p + .0001) * influence * (.012 + uVelocity*.018);
  vec4 a = texture2D(uTexture, vUv + offset);
  vec4 b = texture2D(uTexture, vUv - offset*.65);
  gl_FragColor = mix(a,b,influence*.22);
}
