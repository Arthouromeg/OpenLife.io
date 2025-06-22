//added smooth life to video feedback structure
// mat 200c
// noah thompson
// referenced
// https://arxiv.org/pdf/1111.1567
// https://www.shadertoy.com/view/XtdSDn

let s;
function preload() {
  s = loadShader("shader.vert", "shader.frag");
}

let previous, next;
function setup() {
  createCanvas(500, 500, WEBGL);

  const options = {
    textureFiltering: LINEAR,
    format: FLOAT,
  };
  previous = createFramebuffer(options);
  next = createFramebuffer(options);

  imageMode(CENTER);
  print(pixelDensity());
  //blendMode(BLEND);
}

let x, y, z;
let mode = 3;

function draw() {
  next.begin();
  clear();
  shader(s);
  s.setUniform("u_resolution", [
    width * pixelDensity(),
    height * pixelDensity(),
  ]);
  s.setUniform("u_previous", previous);
  s.setUniform("u_time", millis() / 1000);
  s.setUniform("u_frame_count", frameCount);
  s.setUniform("u_mouse", [mouseX / width, mouseY / height, mouseIsPressed]);
  s.setUniform("u_mode", mode);
  quad(-1, 1, 1, 1, 1, -1, -1, -1);
  next.end();

  image(next, 0, 0);
  [previous, next] = [next, previous];
}

function keyReleased() {
  if (key >= "0" && key <= "9") {
    mode = key - "0";
    print("mode: ", mode);
  }
  if (key == 'r') {
    reset(255);
    print("reset");
  }
  if (key == 't') {
    reset(0);
    print("reset");
  }
}

function reset(c) {
  previous.begin();
  resetShader();
  background(c);
  previous.end();
}