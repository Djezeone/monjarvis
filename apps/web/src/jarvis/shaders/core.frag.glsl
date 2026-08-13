
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

uniform float uTime;
uniform float uEnergy;
uniform float uPulse;
uniform float uPointer;
uniform vec3 uCyan;
uniform vec3 uViolet;
uniform vec3 uGold;

void main(){
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.4);
  float scan = 0.5 + 0.5*sin((vPosition.y + vNoise*.15)*34.0 - uTime*2.4);
  float ring = smoothstep(.82,.2,length(vPosition.xy));
  float pulse = .55 + .45*sin(uTime*2.2)*uPulse;
  vec3 base = mix(uViolet,uCyan, clamp(fresnel + .25*vNoise, 0.0,1.0));
  base = mix(base,uGold, clamp(uPointer*.35 + scan*.08,0.0,.45));
  float alpha = .42 + fresnel*.5 + scan*.06 + pulse*.08 + uEnergy*.05;
  gl_FragColor = vec4(base*(.6+fresnel*1.35+uEnergy*.2), alpha);
}
