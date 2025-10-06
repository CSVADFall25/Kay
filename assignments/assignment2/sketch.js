/*
Mini-assignment 2

Notes:
- Modified the PaletteExplorer sketch to add a side palette containing each
  shape's color next to its complimentary color
- Changing the shape's color also changes its complimentary color on the side
  so the user can now visualize 6 colors together (3 original; 3 complimentary)

*/

let swatch1;
let swatch2;
let swatch3;

let swatches = [];
let colorShift = false;

function setup() {
  createCanvas(800, 800);

  swatch1 = new Swatch(100, 100, 500, 500);
  swatch2 = new Swatch(150, 450, 300, 100);
  swatch3 = new Swatch(150, 200, 200, 200);

  swatches.push(swatch1, swatch2, swatch3);
}

function draw() {
  colorMode(RGB, 255);
  background(200, 200, 200);

  for (let i = 0; i < swatches.length; i++) {
    swatches[i].draw();

    fill(color(swatches[i].c));
    rect(650, 100 + (i * 50), 50, 50);

    fill(color(swatches[i].complimentary_c));
    rect(700, 100 + (i * 50), 50, 50);
  }


  fill(0);
  text('click to select a swatch, drag to move, hold down key to change hue',10, height-10);
}

function mousePressed() {
  for (let i = swatches.length - 1; i >= 0; i--) {
    let s = swatches[i];
    let hitTest = s.hitTest(mouseX, mouseY);

    if (hitTest) {
      s.selected = true;
      print("selected", i);
      return;
    }
  }
}

function keyPressed() {
  colorShift = true;
}

function keyReleased() {
  colorShift = false;
}

function mouseReleased() {
  deselectAllSwatches();
}

function mouseWheel(event) {
  let e = round(event.delta); // event.getCount() equivalent
  for (let i = 0; i < swatches.length; i++) {
    let s = swatches[i];
    if (s.selected) {
      if (colorShift) {
        s.updateColor(createVector(0, 0), e);
      }
      return;
    }
  }
}

function mouseDragged() {
  let delta = createVector(mouseX - pmouseX, mouseY - pmouseY);
  for (let i = 0; i < swatches.length; i++) {
    let s = swatches[i];
    if (s.selected) {
      if (!colorShift) {
        s.moveBy(delta);
      } else {
        s.updateColor(delta, 0);
      }
      return;
    }
  }
}

function deselectAllSwatches() {
  for (let i = 0; i < swatches.length; i++) {
    swatches[i].selected = false;
  }
}

// ---------------- Swatch Class ----------------

class Swatch {
  constructor(x, y, w, h) {
    this.pos = createVector(x, y);
    this.w = w;
    this.h = h;
    this.c = color(random(255), random(255), random(255));
    this.setComplimentaryColor();
    this.selected = false;
  }

  draw() {
    fill(this.c);
    rect(this.pos.x, this.pos.y, this.w, this.h);
    if (this.selected) {
      noFill();
      stroke(0);
      strokeWeight(2);
      rect(this.pos.x, this.pos.y, this.w, this.h);
      noStroke();
    }
  }

  setComplimentaryColor() {
    let r_c = 255 - red(this.c);
    let g_c = 255 - green(this.c);
    let b_c = 255 - blue(this.c);
    this.complimentary_c = color(r_c, g_c, b_c);
  }

  hitTest(mx, my) {
    return (mx > this.pos.x && mx < this.pos.x + this.w &&
            my > this.pos.y && my < this.pos.y + this.h);
  }

  moveBy(delta) {
    this.pos.add(delta);
  }

  updateColor(delta, wheelDelta) {
    // Simple example: shift color channels
    let r = red(this.c) + delta.x * 0.5 + wheelDelta;
    let g = green(this.c) + delta.y * 0.5;
    let b = blue(this.c);

    this.c = color(constrain(r, 0, 255),
                   constrain(g, 0, 255),
                   constrain(b, 0, 255));

    this.setComplimentaryColor();
  }
}
