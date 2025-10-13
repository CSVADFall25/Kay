/*
This example combines the KMeans example with the voronoi example
and adds user input for composition lines and Voronoi point creation

The user can click on the left image to create composition line endpoints
(2 clicks draw a line from the first click to the second click point)

The user can then toggle the voronoi drawing which will use the 
composition line endpoints as the centers of the voronoi drawing,
and segment the drawing based on that.

From the original K-Means example, the user can also adjust the 
underlying K-Means composition of the drawing, which increases/decreases 
the number of colors that show up in the modified drawing.

ChatGPT was used, but only for helping write the "mouseClicked" function
*/


let img;
let outImg;
let cvReady = false;
let voronoi;
let k = 5; // number of clusters
let showVoronoi = false;
let voronoiColors = [];

let lineStart = null;
let lines = [];
let points = []; // for the delunay/voronoi

function onOpenCvReady() {
  document.getElementById('status').innerText = 'OpenCV.js is ready ✅';
  cvReady = true;
}

function clearLines() {
  // clear canvas
  clear();

  // redraw segmented image and original image
  if (outImg) {
    image(outImg, 0, 0);
  }
  if (img) {
    image(img, img.width, 0);
  }

  // clear stored lines and reset line start
  lines = [];
  points = [];
  lineStart = null;
}

function toggleVoronoi() {
  // hide voronoi but put everything back
  if (showVoronoi) {
    showVoronoi = false;
    image(outImg, 0, 0);
    image(img, img.width, 0);
    drawKMeansTextBoxes();
    drawCompositionLines();
    return;
  }

  if (points.length < 3) return;
  delaunay = d3.Delaunay.from(points);
  voronoi = delaunay.voronoi([0, 0, img.width, img.height]);

  // draw voronoi
  stroke(0, 255, 0, 180);
  strokeWeight(3);
  i = 0;
  for (let cell of voronoi.cellPolygons()) {
    fill_color = voronoiColors[i];
    fill(fill_color[0], fill_color[1], fill_color[2], 80);
    beginShape();
    for (let [x, y] of cell) vertex(x, y);
    endShape(CLOSE);
    i++;
  }

  // draw points
  noStroke();
  fill(255, 100, 100);
  for (i = 0; i < points.length; i++) {
    p = points[i]
    circle(p[0], p[1], 5);
  }
  showVoronoi = true;
}

function setup() {
  createCanvas(800, 800);
  noLoop();
  // Let user upload an image
  createFileInput(handleFile).position(10, 40);

  // Add clear lines button
  let clearButton = createButton('Clear Lines');
  clearButton.position(700, 40);
  clearButton.mousePressed(clearLines);

  // Add create delunay/voronoi button from points
  let drawVoronoiButton = createButton('Toggle Voronoi');
  drawVoronoiButton.position(500, 40);
  drawVoronoiButton.mousePressed(toggleVoronoi);

  // set some random colors for voronoi segmentation
  for (i = 0; i < 100; i++) {
    r = random(255);
    g = random(255);
    b = random(255);
    voronoiColors.push([r, g, b]);
  }
}

function mouseClicked() {
  // Check if click is within the left image area
  if (!img) {
    return;
  }
  if (mouseX >= 0 && mouseX < img.width && mouseY >= 0 && mouseY < img.height) {
    fill(255);
    noStroke();
    circle(mouseX, mouseY, 5);

    if (lineStart === null) {
      // First click - set start point
      lineStart = { x: mouseX, y: mouseY };
      points.push([mouseX, mouseY]);
    } else {
      // Second click - draw line and reset start point
      stroke(255);
      strokeWeight(5);
      line(lineStart.x, lineStart.y, mouseX, mouseY);

      // Add finished line to lines array
      lines.push({ start: lineStart, end: { x: mouseX, y: mouseY } });
      points.push([mouseX, mouseY]);
      lineStart = null;
    }
  }
}

function handleFile(file) {
  if (file.type === 'image') {
    img = loadImage(file.data, () => {
      resizeCanvas(img.width * 2, img.height);
      image(img, 0, 0);
      if (cvReady) {
        segmentImage();
      } else {
        console.log("OpenCV not ready yet.");
      }
    });
  }
}

function segmentImage() {
  // Convert p5 image to cv.Mat
  img.loadPixels();
  let src = cv.matFromImageData(img.canvas.getContext('2d').getImageData(0, 0, img.width, img.height));

  // Convert RGBA to RGB
  let rgb = new cv.Mat();
  cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

  let rows = rgb.rows;
  let cols = rgb.cols;
  let channels = rgb.channels();
  let sampleCount = rows * cols;

  // Flatten the image into N x 3 float matrix
  let samples = new cv.Mat(sampleCount, channels, cv.CV_32F);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      for (let c = 0; c < channels; c++) {
        samples.floatPtr(y * cols + x)[c] = rgb.ucharPtr(y, x)[c];
      }
    }
  }

  // K-means
  let labels = new cv.Mat();
  let centers = new cv.Mat();
  let criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 10, 1.0);

  cv.kmeans(samples, k, labels, criteria, 3, cv.KMEANS_PP_CENTERS, centers);

  // Reconstruct clustered image
  let clustered = new cv.Mat(rows, cols, rgb.type());
  for (let i = 0; i < sampleCount; i++) {
    let cluster_idx = labels.intAt(i, 0);
    let y = Math.floor(i / cols);
    let x = i % cols;
    for (let c = 0; c < channels; c++) {
      clustered.ucharPtr(y, x)[c] = centers.floatAt(cluster_idx, c);
    }
  }

  // Convert back to RGBA
  let dst = new cv.Mat();
  cv.cvtColor(clustered, dst, cv.COLOR_RGB2RGBA);

  // Convert to p5 Image
  outImg = createImage(cols, rows);
  outImg.loadPixels();
  outImg.pixels.set(dst.data);
  outImg.updatePixels();

  // Draw the segmented image
  image(outImg, 0, 0);

  // Draw original image for comparison
  image(img, img.width, 0);

  drawKMeansTextBoxes();

  drawCompositionLines();

  // Cleanup
  src.delete(); rgb.delete(); samples.delete();
  labels.delete(); centers.delete();
  clustered.delete(); dst.delete();
}

function drawKMeansTextBoxes() {
  // Draw textbox with number of colors (k) on top-left corner of outImg
  fill(0, 0, 0, 150);
  noStroke();
  rect(10, 10, 155, 30, 5);
  fill(255);
  textSize(15);
  textAlign(LEFT, CENTER);
  text('# of K-Means colors: ' + k, 20, 25);
}

function drawCompositionLines() {
  // Draw composition lines
  stroke(255);
  strokeWeight(5);
  for (i = 0; i < lines.length; i++) {
    l = lines[i];
    line(l.start.x, l.start.y, l.end.x, l.end.y);
  }
}

function keyPressed() {
  if (key === '+' || key === '=') {
    k++;
    if (img && cvReady) {
      segmentImage();
      showVoronoi = !showVoronoi;
      toggleVoronoi();
    }
  } else if (key === '-' && k > 2) {
    k--;
    if (img && cvReady) {
      segmentImage();
      showVoronoi = !showVoronoi;
      toggleVoronoi();
    }
  }
}

