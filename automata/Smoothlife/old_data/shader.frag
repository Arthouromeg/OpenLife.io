#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform sampler2D u_previous;
uniform float u_time;
uniform int u_frame_count;
uniform vec3 u_mouse;
uniform int u_mode;


#define M_PI 3.1415926535897932384626433832795

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float perlin(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 blur(sampler2D t, vec2 p) {
  vec2 z = 1.0 / u_resolution;
  return (
    texture(t, p) +
    texture(t, p + vec2( 0.0,  z.y)) +
    texture(t, p + vec2( z.x,  z.y)) +
    texture(t, p + vec2( z.x,  0.0)) +
    texture(t, p + vec2( z.x, -z.y)) +
    texture(t, p + vec2( 0.0, -z.y)) +
    texture(t, p + vec2(-z.x, -z.y)) +
    texture(t, p + vec2(-z.x,  0.0)) +
    texture(t, p + vec2(-z.x,  z.y))
  ) / 9.0;
}

vec4 blur2(sampler2D t, vec2 p) {
  vec2 z = 1.0 / u_resolution;
  return (
    36. * texture(t, p)
      +
    // inner ring
    24. * (
      texture(t, p + vec2( 0.0,  z.y)) +
      texture(t, p + vec2( z.x,  0.0)) +
      texture(t, p + vec2( 0.0, -z.y)) +
      texture(t, p + vec2(-z.x,  0.0)))
      +
    16. * (texture(t, p + vec2( z.x,  z.y)) +
      texture(t, p + vec2( z.x, -z.y)) +
      texture(t, p + vec2(-z.x, -z.y)) +
      texture(t, p + vec2(-z.x,  z.y)))
      +
    //outer ring
    6. * (
      texture(t, p + vec2( 0.0,  z.y) * 2.) +
      texture(t, p + vec2( z.x,  0.0) * 2.) +
      texture(t, p + vec2(-z.x,  0.0) * 2.) +
      texture(t, p + vec2( 0.0, -z.y) * 2.))
      +
    texture(t, p + vec2(-z.x, -z.y) * 2.) +
    texture(t, p + vec2( z.x,  z.y) * 2.) +
    texture(t, p + vec2( z.x, -z.y) * 2.) +
    texture(t, p + vec2(-z.x,  z.y) * 2.)
      +
    4. * (
      texture(t, p + vec2( z.x,  z.y * 2.)) +
      texture(t, p + vec2( z.x, -z.y * 2.)) +
      texture(t, p + vec2(-z.x, -z.y * 2.)) +
      texture(t, p + vec2(-z.x,  z.y * 2.)) +
      texture(t, p + vec2( z.x * 2.,  z.y)) +
      texture(t, p + vec2( z.x * 2., -z.y)) +
      texture(t, p + vec2(-z.x * 2., -z.y)) +
      texture(t, p + vec2(-z.x * 2.,  z.y)))
    ) / 256.;
}

float gol(sampler2D t, vec2 p) {
  vec2 z = 1.0 / u_resolution;
  float count = (
    texture(t, p + vec2( 0.0,  z.y)) +
    texture(t, p + vec2( z.x,  z.y)) +
    texture(t, p + vec2( z.x,  0.0)) +
    texture(t, p + vec2( z.x, -z.y)) +
    texture(t, p + vec2( 0.0, -z.y)) +
    texture(t, p + vec2(-z.x, -z.y)) +
    texture(t, p + vec2(-z.x,  0.0)) +
    texture(t, p + vec2(-z.x,  z.y))
  ).x;
  if (texture(t, p).r == 1.0) {
    if (count == 2.0 || count == 3.0) {
      return 1.0;
    }
  }
  else {
    if (count == 3.0) {
      return 1.0;
    }
  }
  return 0.0;

}

  //arbitrary threshold values, subject to change. 
const float b1 = 0.259;
const float b2 = 0.336;
const float d1 = 0.365;
const float d2 = 0.549;

const float alpha_n = 0.028;
const float alpha_m = 0.147;

const vec2 r = vec2(5.0,1.5);

//   smoothing functions 

// like smoothstep

// width of step is given by alphas
  float sigmoid_a(float x, float a, float alpha) {
    return 1.0 / (1.0 + exp(-(x - a) * 4.0 / alpha));
}

float sigmoid_ab(float x, float a, float b, float aAlpha, float bAlpha){
  return (sigmoid_a(x,a, aAlpha) * 1.0 - sigmoid_a(x,b, bAlpha));
}

// like mix but with sigmoid like interpolation
float sigmoid_m(float x, float y, float m, float am) {
    return x * (1.0 - sigmoid_a(m, 0.5, am)) + y * sigmoid_a(m, 0.5, am);
}

//s(n, m) = σ2(n, σm(b1, d1, m), σm(b2, d2, m))
float transition(vec2 disk_ring) {
    return sigmoid_m(sigmoid_ab(disk_ring.x, b1, b2, alpha_n, alpha_n),
                       sigmoid_ab(disk_ring.x, d1, d2, alpha_n, alpha_n), disk_ring.y, alpha_m
                      );
}

float ramp_step(float steppos, float t) {
    return clamp(t-steppos+0.5, 0.0, 1.0);
}

vec2 convolve(vec2 uv) {
    vec2 result = vec2(0.0);
    for (float dx = -r.x; dx <= r.x; dx++) {
        for (float dy = -r.x; dy <= r.x; dy++) {
            vec2 d = vec2(dx, dy);
            float dist = length(d);
            vec2 offset = d / u_resolution.xy;
            vec2 samplepos = uv + offset;
            //if(dist <= r.y + 1.0) {
                float weight = texture(u_previous, samplepos).x;
            	result.x += weight * ramp_step(r.y, dist) * (1.0-ramp_step(r.x, dist));	
            	
            //} else if(dist <= r.x + 1.) {
                //float weight = texture(iChannel0, uv+offset).x;
				result.y += weight * (1.0-ramp_step(r.y, dist));
            //}
        }
    }
    return result;
}





float SmoothLife(sampler2D t, vec2 p){
  vec2 area = M_PI * r * r;
  area.x -= area.y;
  
  vec2 disk_ring = convolve(p) / area;
  
  float tran = transition(disk_ring);
  
  float center = texture(t, p).x;
  
  
  

  
  
    // now try SmoothLife
  // https://www.shadertoy.com/view/XtdSDn
  

  
  
  
  return mix(center, tran, 0.9);
}
float map(float value, float low, float high, float Low, float High) {
  return Low + (High - Low) * ((value - low) / (high - low));
}

vec2 scaleRotate(vec2 v, vec2 pivot, vec2 scale, float angle) {
    return
      pivot + (v - pivot)
        * scale
        * mat2(
            vec2(cos(angle), -sin(angle)),
            vec2(sin(angle),  cos(angle)));
}


vec2 to_cartesian(vec2 p) {
    return vec2(p.x * cos(p.y * M_PI), p.x * sin(p.y * M_PI));
}

vec2 to_polar(vec2 p) {
  float r = length(p);
  float theta = atan(p.y, p.x);
  return vec2(r, theta / M_PI);
}


void main() {
  vec2 pixel = gl_FragCoord.xy / u_resolution;
  vec4 previous = texture(u_previous, pixel);

  vec2 transformed = scaleRotate(pixel, vec2(0.5), vec2(1.001), radians(0.7));
  vec4 convolved = blur2(u_previous, transformed);
  glFragColor = mix(previous, convolved, 0.7);

  if (u_mouse.z == 1.0 && distance(pixel, u_mouse.xy) < 0.05) {
    float a = random(u_mouse.xy);
    float b = random(u_mouse.yx);
    glFragColor = vec4(a, 1.0 - b * a, b * b, 1.0);
  }

  if (u_mode == 1) {
    glFragColor = vec4(vec3((random(pixel) + random(vec2(u_time))) > 1.0), 1.0);
  } else if (u_mode == 2) {
    glFragColor = vec4(vec3(gol(u_previous, pixel)), 1.0);
  } else if (u_mode == 3) {
    float result = SmoothLife(u_previous, pixel);
    if (u_mouse.z == 1.0 && distance(pixel, u_mouse.xy) < 0.01) {
      glFragColor = mix(vec4(vec3(result), 1.0), vec4(1), 0.5);
    } else {
      glFragColor = vec4(vec3(result), 1.0);
    }
  } else if (u_mode == 4) {
    glFragColor = vec4(vec3(perlin(pixel * 15.0)), 1.0);
  }
}
