let colors = []; // read the json for the fall color palette
let selectedIndex = 0;
let swatchSize = 35;
let swatchMargin = 5;

let drawing = [];
let isDrawing = false;

let paletteData;

function preload() {
  // Load the JSON file that has fall color palette swatch rgbs
  paletteData = loadJSON('assets/palette.json');
}

function setup() {
  createCanvas(800, 800);
  colorMode(RGB, 255);

  // Extract colors from JSON data
  colors = [];
  if (paletteData && paletteData.colors) {
    for (let c of paletteData.colors) {
      colors.push(color(c.value));
    }
  }

  selectedIndex = 0;
  background(255);
}

function draw() {
  // todo maybe more efficient way than this??
  background(255); // clears canvas each frame

  // Draw color swatches on left
  noStroke();
  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    let x = swatchMargin;
    let y = swatchMargin + i * (swatchSize + swatchMargin);
    rect(x, y, swatchSize, swatchSize);

    // todo draw leaves instead of square shapes
    // drawLeaf(x, y, swatchSize);

    if (i === selectedIndex) {
      stroke(0);
      strokeWeight(3);
      noFill();
      rect(x - 2, y - 2, swatchSize + 4, swatchSize + 4);
      noStroke();
    }
  }

  // Outline drawing area
  stroke(0);
  strokeWeight(2);
  noFill();
  let drawAreaX = swatchSize + 2 * swatchMargin;
  rect(drawAreaX, 0, width - drawAreaX, height);

  // Draw stored lines
  // for now, todo full gravity thingy
  noFill();
  for (let strokeData of drawing) {
    stroke(strokeData.color);
    strokeWeight(10);
    beginShape();
    for (let pt of strokeData.points) {
      vertex(pt.x, pt.y);
    }
    endShape();
  }
}

function mousePressed() {
  // Check if clicked on swatch
  for (let i = 0; i < colors.length; i++) {
    let x = swatchMargin;
    let y = swatchMargin + i * (swatchSize + swatchMargin);
    if (mouseX >= x && mouseX <= x + swatchSize &&
        mouseY >= y && mouseY <= y + swatchSize) {
      selectedIndex = i;
      return;
    }
  }

  // Start drawing if clicked in drawing area
  let drawAreaX = swatchSize + 3 * swatchMargin;
  if (mouseX > drawAreaX) {
    isDrawing = true;
    drawing.push({ color: colors[selectedIndex], points: [{ x: mouseX, y: mouseY }] });
  }
}

function mouseDragged() {
  if (isDrawing) {
    let drawAreaX = swatchSize + 3 * swatchMargin;
    if (mouseX > drawAreaX) {
      let currentStroke = drawing[drawing.length - 1];
      currentStroke.points.push({ x: mouseX, y: mouseY });
    }
  }
}

function mouseReleased() {
  isDrawing = false;
}


