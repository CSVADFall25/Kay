let colors = []; // read the json for the fall color palette
let selectedIndex = 0;
let swatchSize = 35;
let swatchMargin = 5;
let swatchesPerRow = 5; // new: number of columns in the grid

let drawing = [];
let isDrawing = false;
let dotSize = 40; // size of each drawn point/dot
let dotInterval = 400; // push a dot every dotInterval ms

let paletteData;

let fallingLeaves = []; // array of FallingLeaf instances

function preload() {
  // Load the JSON file that has fall color palette swatch rgbs
  paletteData = loadJSON('assets/palette.json');
}

function setup() {
  createCanvas(800, 600);
  colorMode(RGB, 255);
  frameRate(30);

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

// helper to compute swatch position for index based on a grid centered vertically on left
function getSwatchPos(index) {
  let cols = swatchesPerRow;
  let rows = ceil(colors.length / cols);
  let totalH = rows * swatchSize + max(0, rows - 1) * swatchMargin; // total grid height (no extra outer margin)
  let startX = swatchMargin;
  let startY = height / 2 - totalH / 2;

  let row = floor(index / cols);
  let col = index % cols;
  let x = startX + col * (swatchSize + swatchMargin);
  let y = startY + row * (swatchSize + swatchMargin);
  return { x, y, cols, rows, startX, startY };
}

function draw() {
  // todo maybe more efficient way than this??
  background(255); // clears canvas each frame

  // Draw color swatches in a grid on the mid-left
  noStroke();
  for (let i = 0; i < colors.length; i++) {
    let pos = getSwatchPos(i);
    fill(colors[i]);
    rect(pos.x, pos.y, swatchSize, swatchSize);

    // todo draw leaves instead of square shapes
    // drawLeaf(pos.x, pos.y, swatchSize);

    if (i === selectedIndex) {
      stroke(0);
      strokeWeight(3);
      noFill();
      rect(pos.x - 2, pos.y - 2, swatchSize + 4, swatchSize + 4);
      noStroke();
    }
  }

  // Outline drawing area (compute draw area after grid width)
  let gridInfo = getSwatchPos(0); // contains cols/rows/startX/startY
  let cols = gridInfo.cols;
  let totalW = cols * swatchSize + max(0, cols - 1) * swatchMargin;
  let drawAreaX = gridInfo.startX + totalW + swatchMargin * 2;

  stroke(0);
  strokeWeight(2);
  noFill();
  rect(drawAreaX, 0, width - drawAreaX, height);

  // Draw stored dots instead of continuous lines
  // for (let strokeData of drawing) {
  //   noStroke();
  //   fill(strokeData.color);
  //   for (let pt of strokeData.points) {
  //     circle(pt.x, pt.y, dotSize);
  //   }
  // }

  // Update all FallingLeaf movers (each operates on its referenced point)
  noStroke();
  for (let fd of fallingLeaves) {
    fd.update();
    fd.checkEdges();
    fill(fd.color);
    drawLeaf(fd.point.x, fd.point.y, fd.scale, fd.flip);
  }
}

function drawLeaf(x, y, leafScale, leafFlip) {
  // circle(x, y, size); 

  push();
  translate(x, y);
  scale(leafScale);
  scale(leafFlip, 1);

  // bezier vertex syntax
  // bezierVertex(x2, y2, x3, y3, x4, y4)
  // x2, y2 and x3, y3 are control points
  // x4, y4 is the destination vertex

  // draw the leaf shape
  beginShape();

  // anchor point and bezier vertices
  vertex(0, 10);
  bezierVertex(40, -5, 30, 15, 45, 20);
  bezierVertex(40, 15, 30, 40, 0, 10);

  endShape();
  endShape(CLOSE);

  pop();
}


function mousePressed() {
  // Check if clicked on any swatch in the grid
  for (let i = 0; i < colors.length; i++) {
    let pos = getSwatchPos(i);
    if (mouseX >= pos.x && mouseX <= pos.x + swatchSize &&
        mouseY >= pos.y && mouseY <= pos.y + swatchSize) {
      selectedIndex = i;
      return;
    }
  }

  // Start drawing if clicked in drawing area
  let gridInfo = getSwatchPos(0);
  let cols = gridInfo.cols;
  let totalW = cols * swatchSize + max(0, cols - 1) * swatchMargin;
  let drawAreaX = gridInfo.startX + totalW + swatchMargin * 2;

  if (mouseX > drawAreaX) {
    isDrawing = true;
    // store lastDot timestamp on the stroke so we can rate-limit dot placement
    let now = millis();
    let newStroke = { color: colors[selectedIndex], points: [{ x: mouseX, y: mouseY }], lastDot: now };
    drawing.push(newStroke);

    // create a FallingLeaf for this initial point so it begins falling immediately
    let fd = new FallingLeaf(newStroke.points[0], dotSize, colors[selectedIndex]);
    fallingLeaves.push(fd);
  }
}

function mouseDragged() {
  if (isDrawing) {
    let gridInfo = getSwatchPos(0);
    let cols = gridInfo.cols;
    let totalW = cols * swatchSize + max(0, cols - 1) * swatchMargin;
    let drawAreaX = gridInfo.startX + totalW + swatchMargin * 2;

    if (mouseX > drawAreaX) {
      let currentStroke = drawing[drawing.length - 1];
      // push a dot only once per dotInterval (ms)
      let now = millis();
      if (!currentStroke.lastDot || now - currentStroke.lastDot >= dotInterval) {
        let pt = { x: mouseX, y: mouseY };
        currentStroke.points.push(pt);
        currentStroke.lastDot = now;

        // create a FallingLeaf for this new point as well
        let fd = new FallingLeaf(pt, dotSize, colors[selectedIndex]);
        fallingLeaves.push(fd);
      }
    }
  }
}

function mouseReleased() {
  isDrawing = false;
}