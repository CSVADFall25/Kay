/*
Main sketch for Autumn Leaves Drawing Tool

This tool "draws" leaves that fall down onto the canvas floor. Instead of
drawing leaves exactly where the user clicks/drags, the leaves obey physics, 
drift down with gravity and stack on top of each other to create leaf piles. 
Clearing the canvas triggers a cat jumping into the canvas to 
scatter the leaf pile. 

Assets:
The color palette, under the assets directory, was built via the 
ColorBuilder tool [https://colorsails.com/build] (e.g. see palette.svg), then
raw values were extracted into a JSON file (palette.json) that this script reads in.
I drew the two cat frames (cat_falling.png & cat.png) in procreate.  

References/Help Used
- https://p5js.org/reference/p5/bezierVertex/ for drawing the custom leaf shape
- ChatGPT was used primarily in getSwatchPos and the mouse interaction (i.e. mousePressed, mouseDragged)
*/


// color palette swatch grid variables
let paletteData; // stores json fall color palette data
let colors = []; // the list of colors from the json
let selectedIndex = 0;
let swatchSize = 40;
let swatchMargin = 10;
let swatchesPerRow = 5;

// variables for canvas clearing 
let catImage; // image of the cat to draw once leaves scattered
let catFallingImage; // image of the cat falling during clearing animation
let clearingStartTime = 0; // timestamp when clearing animation started
let flyUpTriggered = false; // flag to trigger leaves to scatter up

// drawing variables
let drawing = [];
let isDrawing = false;

// leaf drawing variables
let leafSize = 35; // rough size/diameter of each drawn leaf
let leafInterval = 200; // dictates how often often (ms) to spawn new leaves
let leaves = []; // array of Leaf instances


function preload() {
  // Load the JSON file that has fall color palette swatch rgbs
  paletteData = loadJSON('assets/palette.json');

  // Load cat images for canvas clearing animation
  catImage = loadImage('assets/cat.png');
  catFallingImage = loadImage('assets/cat_falling.png');
}


function setup() {
  createCanvas(800, 500);

  // clear button
  let clearButton = createButton('Clear Canvas');
  clearButton.position(10, 20);
  clearButton.mousePressed(clearCanvas);

  colorMode(RGB, 255);
  frameRate(30); // lower frame rate because my computer is weak

  // Extract colors from JSON data
  colors = [];
  if (paletteData && paletteData.colors) {
    for (let c of paletteData.colors) {
      colors.push(color(c.value));
    }
  }

  // by default, select the 'first' color in the palette
  selectedIndex = 0;
  background(255);
}

let isClearing = false; // flag to indicate leaf scattering animation in progress

function clearCanvas() {
  if (isClearing) return; // prevent multiple clears during animation
  
  // if no leaves to clear, don't play cat/scattering animation
  if (leaves.length === 0) {
    background(255);
    return;
  }

  // else start the clearing animation
  isClearing = true;
  clearingStartTime = millis();

  // disable drawing user strokes during animation
  isDrawing = false;

  // after 2 seconds, clear canvas and reset leaves
  setTimeout(() => {
    leaves = [];
    drawing = [];
    background(255);
    isClearing = false;
  }, 2000);
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
  background(255); // clears canvas each frame

  // add note to select color below
  // fill color taken from palette
  fill(61, 89, 65);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Select Color:", 5, 120);

  // Draw color swatches in a grid on the mid-left
  noStroke();
  for (let i = 0; i < colors.length; i++) {
    let pos = getSwatchPos(i);
    fill(colors[i]);
    drawPaletteLeaf(pos.x, pos.y, 1, 1);

    // outline the selected swatch
    if (i === selectedIndex) {
      stroke(colors[selectedIndex]);
      strokeWeight(5);
      noFill();
      drawPaletteLeaf(pos.x - 2, pos.y - 2, 1.1, 1);
      noStroke();
    }
  }

  // Outline drawing area (compute draw area after grid width)
  let gridInfo = getSwatchPos(0); // ols/rows/startX/startY
  let cols = gridInfo.cols;
  let totalW = cols * swatchSize + max(0, cols - 1) * swatchMargin;
  let drawAreaX = gridInfo.startX + totalW + swatchMargin * 2;

  // color the canvas outline with the selected color
  stroke(colors[selectedIndex]);
  strokeWeight(4);
  noFill();
  rect(drawAreaX + 2, 2, width - drawAreaX - 4, height - 4);

  // During clearing animation, only update and draw flying leaves, skip user strokes
  if (isClearing) {
    let elapsed = millis() - clearingStartTime;

    // first half of animation: cat falls
    if (elapsed < 1000) {
      // draw falling cat dropping from top to bottom
      if (catFallingImage) {
        let y = map(elapsed, 0, 1000, -400, height - catFallingImage.height);
        image(catFallingImage, width / 2 - catFallingImage.width / 2, y);
      }
    } 
    // second half: cat on ground and leaves fly up
    else if (elapsed < 2000) {
      // draw flipped cat img on canvas
      if (catImage) {
        push();
        translate(width / 2 + catImage.width / 2, height - catImage.height);
        scale(-1, 1);
        image(catImage, 0, 0);
        pop();
      }

      // trigger fly-up/scattering animation for all leaves
      if (!flyUpTriggered) {
        for (let leaf of leaves) {
          leaf.flyUp();
        }
        flyUpTriggered = true;
      }
    }

    // update the leaves as they flying up
    noStroke();
    for (let leaf of leaves) {
      leaf.update();
      // don't check side edges here for fun leaves scattering out of canvas
      leaf.checkBottomEdges(leaves);
      fill(leaf.color);
      drawLeaf(leaf.point.x, leaf.point.y, leaf.scale, leaf.flip, leaf.rotate);
    }
    return;
  }

  // below is normal behavior when not clearing canvas
  flyUpTriggered = false; // reset for next clear

  // update and draw all leaves
  noStroke();
  for (let leaf of leaves) {
    leaf.update();
    leaf.checkEdges(leaves);
    fill(leaf.color);
    drawLeaf(leaf.point.x, leaf.point.y, leaf.scale, leaf.flip, leaf.rotate);
  }
}

// palette leaf uses (0,0) as top-left anchor
// so that grid layout is easier to compute
function drawPaletteLeaf(x, y, leafScale, leafFlip) {
  push();
  translate(x, y);
  scale(leafScale);
  scale(leafFlip, 1);

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

// normal leaf uses (0,0) as center anchor
// so that it spawns properly at the user's mouse position
// and collision w/floor and other leaves is based on the leaf center
function drawLeaf(x, y, leafScale, leafFlip, leafRotate) {
  push();
  translate(x, y);
  rotate(leafRotate); // slight rotation for more natural look
  scale(leafScale);
  scale(leafFlip, 1);

  // draw the leaf shape
  beginShape();

  // anchor point and bezier vertices
  vertex(-20, 0);
  bezierVertex(20, -15, 10, 5, 25, 10);
  bezierVertex(20, 5, 10, 30, -20, 0);

  endShape();
  endShape(CLOSE);

  pop();
}


function mousePressed() {
  // set swatch if pressed new color selection
  for (let i = 0; i < colors.length; i++) {
    let pos = getSwatchPos(i);
    if (mouseX >= pos.x && mouseX <= pos.x + swatchSize &&
        mouseY >= pos.y && mouseY <= pos.y + swatchSize) {
      selectedIndex = i;
      return;
    }
  }

  // start drawing if clicked in drawing area
  let gridInfo = getSwatchPos(0);
  let cols = gridInfo.cols;
  let totalW = cols * swatchSize + max(0, cols - 1) * swatchMargin;
  let drawAreaX = gridInfo.startX + totalW + swatchMargin * 2;

  if (mouseX > drawAreaX && !isClearing) {
    isDrawing = true;
    // store lastDot timestamp on the stroke so we can rate-limit leaf placement
    // aka spawn leaf only once per leafInterval (ms)
    let now = millis();
    let newStroke = { color: colors[selectedIndex], points: [{ x: mouseX, y: mouseY }], lastDot: now };
    drawing.push(newStroke);

    // create a leaf for this initial point so it begins falling immediately
    let leaf = new Leaf(newStroke.points[0], leafSize, colors[selectedIndex]);
    leaves.push(leaf);
  }
}

// dragging the mouse will also spawn falling leaves at intervals
function mouseDragged() {
  if (isDrawing) {
    let gridInfo = getSwatchPos(0);
    let cols = gridInfo.cols;
    let totalW = cols * swatchSize + max(0, cols - 1) * swatchMargin;
    let drawAreaX = gridInfo.startX + totalW + swatchMargin * 2;

    if (mouseX > drawAreaX) {
      let currentStroke = drawing[drawing.length - 1];
      // push a leaf only once per leafInterval (ms)
      let now = millis();
      if (!currentStroke.lastDot || now - currentStroke.lastDot >= leafInterval) {
        let pt = { x: mouseX, y: mouseY };
        currentStroke.points.push(pt);
        currentStroke.lastDot = now;

        // create a Leaf for this new point as well
        let leaf = new Leaf(pt, leafSize, colors[selectedIndex]);
        leaves.push(leaf);
      }
    }
  }
}

function mouseReleased() {
  isDrawing = false;
}