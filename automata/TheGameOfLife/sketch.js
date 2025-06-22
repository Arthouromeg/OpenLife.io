let golShader;
let prevFrame;
let zoom = 1;
const zoomSpeed = 0;

function preload() {
  golShader = loadShader('gol.vert', 'gol.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  noSmooth();

  prevFrame = createGraphics(width, height);
  prevFrame.pixelDensity(1);
  prevFrame.noSmooth();

  background(0);
  stroke(255);
  shader(golShader);
  golShader.setUniform("normalRes", [1.0 / width, 1.0 / height]);

  // Zoom with mouse wheel
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom += (e.deltaY > 0 ? -1 : 1) * zoomSpeed;
    zoom = constrain(zoom, 0.1, 10);
  }, { passive: false });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  prevFrame.resizeCanvas(width, height);
  golShader.setUniform("normalRes", [1.0 / width, 1.0 / height]);
  background(0);
}

function draw() {
  scale(zoom);

  if (mouseIsPressed) {
    line(
      pmouseX - width / 2,
      pmouseY - height / 2,
      mouseX - width / 2,
      mouseY - height / 2
    );
  }

  prevFrame.image(get(), 0, 0);
  golShader.setUniform('tex', prevFrame);
  rect(-width / 2, -height / 2, width, height);
}
