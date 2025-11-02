/*
Mini assignment 4

Modified the `basic_bar_distributed` example to use my strava running data
Colored run speed (mph) and bar height measured by distance run

Data preprocessing script written in `preprocess_data.py` 

Cleaned data in `data/activities_cleaned.csv`
*/


let table;
let distance = [];
let labels = [];
let energy = [];
let duration = [];
let tooltipGraphics;
let earliestDate;
let latestDate;
let totalDays;

function preload() {
  // Make sure your CSV is in the same folder as the sketch
  table = loadTable('data/activities_cleaned.csv', 'csv', 'header');
}

function setup() {
  createCanvas(1600, 400);
  tooltipGraphics = createGraphics(1600, 400);
  // draw() will run continuously to support hover interaction

  console.log(table.getRowCount())
  console.log(table.getColumn('Activity Date'))
  console.log(table.getColumn('Average Speed'))
  if (!table || table.getRowCount() === 0) {
    console.error("Table is not loaded or empty!");
    return;
  }

  // Extract all values data from CSV
  for (let r = 0; r < table.getRowCount(); r++) {
    let activityDate = table.getString(r, 'Activity Date');
    if(earliestDate === undefined || compareDates(formatDate(activityDate), earliestDate) === -1) {
      earliestDate = formatDate(activityDate);
    }
    if(latestDate === undefined || compareDates(formatDate(activityDate), latestDate) === 1) {
      latestDate = formatDate(activityDate);
    }
    labels.push(formatDate(activityDate));
    distance.push(float(table.getString(r, 'Distance')));
    energy.push(float(table.getString(r, 'Average Speed')));
    duration.push(float(table.getString(r, 'Moving Time')));
  }

  console.log("Earliest date: " + earliestDate);
  console.log("Latest date: " + latestDate);
  totalDays = computeDateDifference(earliestDate, latestDate);
  console.log("Total days between: " + totalDays);
  // initial frame will be drawn in draw()
}

function draw() {
  drawBarChart(duration, energy, distance, labels);
  drawAxes();

}

function drawAxes() {
  stroke(0);
  strokeWeight(1);
  line(0, height-10, width, height - 10); // x-axis
  let spacing = width/totalDays;
  for (let d = 0; d <= totalDays; d += 30) {
    let x = d * spacing;
    line(x, height - 15, x, height - 5);
  }
  for (let d = 0; d <= totalDays; d += 7) {
    let x = d * spacing;
    line(x, height - 15, x, height - 10);
  }

}

function drawBarChart(values1, values2, values3, labels) {
  background(240);
  textAlign(CENTER, BOTTOM);
  fill(50);
  noStroke();
  tooltipGraphics.clear();
  const barWidth = width / values1.length;
  const maxValue1 = max(values1);
  const maxValue2 = max(values2);
  const minValue2 = min(values2);
  // console.log(maxValue2)
  const maxValue3 = max(values3);
  let preNorm = -1;
  for (let i = 0; i < values1.length; i++) {
    const h = map(values1[i], 0, maxValue1, 0, height - 80);
    let norm = normalizeDate(labels[i], earliestDate, latestDate);

    let x = width*norm;
    if (norm === preNorm) {
      x += 10; // slight offset to avoid exact overlap
    }
    preNorm = norm;
    const y = height -20- h;
    let color =  map(values2[i], minValue2, maxValue2, 0, 128);
    colorMode(HSL);
    fill(color, 80, 60);
    const bx = x + 5;
    const bw = barWidth - 15;
    rect(bx, y, bw, h);

    // Only show tooltip when the mouse is over this bar
    const over = mouseX >= bx && mouseX <= bx + bw && mouseY >= y && mouseY <= y + h;
    if (over) {
      // Prepare tooltip content: date + distance, energy, duration
      const dmi = values3[i];
      const mph = values2[i];
      const hours = values1[i];
      const lines = [
        `${labels[i]}`,
        `Distance: ${nf(dmi, 1, 2)} miles`,
        `Duration: ${nf(hours, 1, 2)} min`,
        `Speed: ${round(mph, 2)} mph`,
      ];

      push();
      // Draw a floating tooltip near the mouse
      tooltipGraphics.colorMode(RGB);
      tooltipGraphics.textAlign(LEFT, TOP);
      tooltipGraphics.textSize(12);
      const padding = 8;
      // Compute tooltip width by longest line
      let tw = 0;
      for (let t of lines) { tw = max(tw, textWidth(t)); }
      let boxW = tw + padding * 2;
      let lineH = 16;
      let boxH = lines.length * lineH + padding * 2;
      let tipX = constrain(mouseX + 12, 0, width - boxW - 1);
      let tipY = constrain(mouseY - (boxH + 12), 0, height - boxH - 1);
      // Background and border
      tooltipGraphics.noStroke();
      tooltipGraphics.fill(0, 0, 0, 200);
      tooltipGraphics.rect(tipX, tipY, boxW, boxH, 6);
      // Text
      tooltipGraphics.fill(255);
      for (let li = 0; li < lines.length; li++) {
        tooltipGraphics.text(lines[li], tipX + padding, tipY + padding + li * lineH);
      }
      pop();
    }
  }
  image(tooltipGraphics, 0, 0);
}

function formatDate(datetimeStr) {
  // Split on space → ["2023-10-16", "14:08:33", "-0700"]
  let datePart = datetimeStr.split(" ")[0];
  
  // Split date part → ["2023", "10", "16"]
  let parts = datePart.split("-");
  let year = parts[0].slice(2); // get last two digits
  let month = parts[1];
  let day = parts[2];

  return `${month}/${day}/${year}`;
}

// --- Date comparison helpers ---
function parseDate(str) {
    const [mStr, dStr, yStr] = str.split('/');
    let m = int(mStr);
    let d = int(dStr);
    let y = int(yStr);
    // Expand 2-digit year to 2000-2099 by default
    if (y < 100) y = 2000 + y;
    return { year: y, month: m, day: d };
}

// Comparator: returns -1 if a<b (a earlier), 1 if a>b (a later), 0 if equal
function compareDates(aStr, bStr) {
  const a = parseDate(aStr);
  const b = parseDate(bStr);
  if (!a || !b) return 0; // cannot compare
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

function computeDateDifference(aStr, bStr) {
  const a = parseDate(aStr);
  const b = parseDate(bStr);
  if (!a || !b) return 0; // cannot compute

  const dateA = new Date(a.year, a.month - 1, a.day);
  const dateB = new Date(b.year, b.month - 1, b.day);
  const diffTime = Math.abs(dateB - dateA);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}
//return a value between 0 and 1 representing the normalized position of dateStr between earliestDate and latestDate
function normalizeDate(dateStr,startDateStr,endDateStr) {
  const targetDate = parseDate(dateStr);
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  if (!targetDate || !startDate || !endDate) return 0; // cannot compute
  const target = new Date(targetDate.year, targetDate.month - 1, targetDate.day);
  const start = new Date(startDate.year, startDate.month - 1, startDate.day);
  const end = new Date(endDate.year, endDate.month - 1, endDate.day);
  const totalDiff = end - start;
  const targetDiff = target - start;
  if (totalDiff === 0) return 0;
  return targetDiff / totalDiff;
}