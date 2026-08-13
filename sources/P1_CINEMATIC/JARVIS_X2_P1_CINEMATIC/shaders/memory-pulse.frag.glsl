
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
void main(){
  vec2 p=vUv-.5;
  float r=length(p);
  float ring=sin(r*70.0-uTime*3.8)*.5+.5;
  float falloff=smoothstep(.5,0.,r);
  vec3 c=mix(vec3(.47,.40,1.),vec3(.36,.92,1.),ring);
  gl_FragColor=vec4(c, ring*falloff*.35*uIntensity);
}
