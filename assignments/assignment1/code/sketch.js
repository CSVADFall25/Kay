// Hello World Portrait

function setup() {
  // set the size of the canvas to 600 x 600 pixels
  createCanvas(600, 600);

  // set the background color to white
  background(255, 255, 255);

  // remove outlines for face/eyes
  noStroke();

  // add green ellipse (face)
  fill(170, 210, 175);
  ellipseMode(CENTER);
  ellipse(width / 2, height / 2, 375, 500);

  // set the fill to white and draw two white rectangles (eyebrows)
  fill(255, 255, 255);
  rectMode(CENTER);
  rect(width / 2 - 10, height / 2 - 80, 120, 20);
  rect(width / 2 + 150, height / 2 - 80, 80, 20);

  // set the fill to green and draw two circles (pupils)
  fill(40, 75, 50);
  ellipse(width / 2 - 10, height / 2 - 50, 30, 30);
  ellipse(width / 2 + 150, height / 2 - 50, 30, 30);

  // draw line (nose)
  fill(0, 0, 0);
  stroke(40, 75, 50);
  strokeWeight(15);
  line(width / 2 + 80, height / 2 - 30, width / 2 + 100, height / 2 + 30);

  // draw an outlined ellipse (mouth)
  fill(215, 180, 160);
  ellipse(width / 2 + 70, height / 2 + 110, 100, 70);
}