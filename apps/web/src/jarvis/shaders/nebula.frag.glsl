
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=.5; }
  return v;
}
void main(){
  vec2 uv=vUv-.5;
  uv.x*=uResolution.x/uResolution.y;
  float d=length(uv);
  float n=fbm(uv*3.4+vec2(uTime*.015,-uTime*.01));
  float glow=smoothstep(.68,.05,d);
  vec3 cyan=vec3(.365,.922,1.);
  vec3 violet=vec3(.47,.40,1.);
  vec3 col=mix(violet,cyan,n);
  col*=glow*(.06+.25*n);
  gl_FragColor=vec4(col,glow*.42);
}
