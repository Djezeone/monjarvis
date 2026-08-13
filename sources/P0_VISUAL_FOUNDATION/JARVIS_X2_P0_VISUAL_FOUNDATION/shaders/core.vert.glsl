
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;
uniform float uTime;
uniform float uEnergy;

float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }

void main(){
  vNormal = normalize(normalMatrix * normal);
  vec3 p = position;
  float wave = sin(p.x*5.0 + uTime*1.4) * sin(p.y*4.0-uTime) * sin(p.z*6.0+uTime*.7);
  vNoise = wave;
  p += normal * wave * 0.035 * uEnergy;
  vPosition = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}
