// Dodge Game — ADXL335 -> p5.js over Web Serial (patched)
var port, reader;
var latest = { ax:512, ay:512, az:700 };  // expose globally
window.latest = latest;

let biases = { x:512, y:512, z:512 };
let vref = 5.0;       // UNO analog ref
let sens = 0.33;      // V/g (typical)
let calibrated = false;

// Game state
let player, bullets, particles, pacmen, score, lives, gameOver, shield, dashTimer, bulletsSpawned;
const W = 900, H = 560;
const PLAYER_R = 14, BULLET_R = 6, MAX_BULLETS = 8;

function setup() {
  const c = createCanvas(W, H);
  c.parent('container');
  initGame();

  document.getElementById('connectBtn').addEventListener('click', connectSerial);
  document.getElementById('calBtn').addEventListener('click', calibrateNow);

  // Helpful for debugging connect/disconnect
  navigator.serial?.addEventListener('disconnect', () => {
    document.getElementById('status').textContent = 'Disconnected';
  });
  navigator.serial?.addEventListener('connect', () => {
    document.getElementById('status').textContent = 'Device connected — click Connect Serial';
  });
}

function initGame() {
  player = { x: W/2, y: H/2, vx:0, vy:0 };
  bullets = [];
  particles = [];
  pacmen = [];
  score = 0;
  lives = 3;
  gameOver = false;
  shield = 0;
  dashTimer = 0;
  BulletsSpawned = false;
}

async function connectSerial() {
  if (!("serial" in navigator)) {
    alert("Web Serial API not supported. Use Chrome/Edge, or enable flags in Brave.");
    return;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const decoder = new TextDecoderStream();
    const input = port.readable.pipeThrough(decoder);
    reader = input.getReader();

    document.getElementById('status').textContent = "Connected (115200) — click Calibrate when flat";
    readLoop();
  } catch (e) {
    document.getElementById('status').textContent = "Serial error: " + e.message;
    console.error(e);
  }
}

async function readLoop() {
  let buffer = "";
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      buffer += value;
      // IMPORTANT: correct newline regex (no double backslash)
      let lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line || line.startsWith("#")) continue;
        const parts = line.trim().split(",");
        if (parts.length >= 3) {
          const ax = parseFloat(parts[0]);
          const ay = parseFloat(parts[1]);
          const az = parseFloat(parts[2]);
          if (isFinite(ax) && isFinite(ay) && isFinite(az)) {
            latest.ax = ax; latest.ay = ay; latest.az = az;
            // Uncomment for debugging:
            // console.log('ACC:', latest.ax, latest.ay, latest.az);
          }
        }
      }
    }
  } catch (e) {
    console.error("[readLoop]", e);
    document.getElementById('status').textContent = "Read error: " + e.message;
  } finally {
    try { reader?.releaseLock(); } catch {}
  }
}

function calibrateNow() {
  // Lay flat: X≈0g, Y≈0g, Z≈+1g
  biases.x = latest.ax;
  biases.y = latest.ay;
  const deltaCountsPerG = (sens / vref) * 1023.0;
  biases.z = latest.az - deltaCountsPerG; // estimate midpoint from +1g
  calibrated = true;
  // Reset player position and velocity to center after calibration
  player.x = W / 2;
  player.y = H / 2;
  player.vx = 0;
  player.vy = 0;
  document.getElementById('status').textContent =
    `Calibrated. RAW bias x:${biases.x.toFixed(0)} y:${biases.y.toFixed(0)} z:${biases.z.toFixed(0)}`;
}

function draw() {
  background(18);
  drawGrid();

  const gx = rawToG(latest.ax, biases.x);
  const gy = rawToG(latest.ay, biases.y);
  const gz = rawToG(latest.az, biases.z);

  drawHUD(gx, gy, gz);

  const k = 6; // movement gain
  player.vx = lerp(player.vx, k * constrain(gx, -1.5, 1.5), 0.15);
  player.vy = lerp(player.vy, k * constrain(gy, -1.5, 1.5), 0.15);
  player.x = constrain(player.x + player.vx, PLAYER_R, W - PLAYER_R);
  player.y = constrain(player.y + player.vy, PLAYER_R, H - PLAYER_R);

  // Shake to dash (brief invulnerability)
  const accelMag = Math.sqrt(gx*gx + gy*gy + gz*gz);
  if (accelMag > 1.5 && dashTimer <= 0) {
    shield = 45;
    dashTimer = 120;
    burst(player.x, player.y, gx, gy);
  }
  if (shield > 0) shield--;
  if (dashTimer > 0) dashTimer--;

  if (frameCount % 25 === 0 && bullets.length < MAX_BULLETS && !bulletsSpawned) spawnBullet();
  if (bullets.length >= MAX_BULLETS) {
    bulletsSpawned = true;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.x < BULLET_R || b.x > W - BULLET_R) b.vx *= -1;
    if (b.y < BULLET_R || b.y > H - BULLET_R) b.vy *= -1;

    const d2 = (b.x - player.x)**2 + (b.y - player.y)**2;
    if (d2 < (PLAYER_R + BULLET_R)**2) {
      if (shield <= 0) {
        lives--;
        burst(player.x, player.y, gx, gy);
        shield = 30;
        if (lives <= 0) gameOver = true;
      } else { b.vx *= -1; b.vy *= -1; }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.98; p.vy *= 0.98;
    p.a -= 6;
    if (p.a <= 0) particles.splice(i, 1);
  }

  // Update and draw pacmen
  for (let i = pacmen.length - 1; i >= 0; i--) {
    const pm = pacmen[i];
    pm.x += pm.vx;
    pm.y += pm.vy;
    pm.mouthTimer++;
    if (pm.mouthTimer % 20 === 0) pm.mouthOpen = !pm.mouthOpen;

    // Remove pacman if it goes off screen
    if (pm.x < -pm.r || pm.x > W + pm.r || pm.y < -pm.r || pm.y > H + pm.r) {
      pacmen.splice(i, 1);
      continue;
    }

    // Calculate angle from velocity vector for mouth direction
    const angle = atan2(pm.vy, pm.vx);

    // Draw pacman shape
    push();
    translate(pm.x, pm.y);
    rotate(angle);
    fill(255, 255, 0);
    noStroke();
    arc(0, 0, pm.r*2, pm.r*2, pm.mouthOpen ? QUARTER_PI : 0, pm.mouthOpen ? TWO_PI - QUARTER_PI : TWO_PI);
    pop();
  }

  if (!gameOver) score++;

  noStroke(); fill(250, 90, 90);
  for (const b of bullets) circle(b.x, b.y, BULLET_R*2);

  if (shield > 0) { stroke(255, 230); noFill(); circle(player.x, player.y, (PLAYER_R+6)*2); noStroke(); }
  fill(120, 200, 255); circle(player.x, player.y, PLAYER_R*2);

  for (const p of particles) { fill(255, p.a); circle(p.x, p.y, p.r*2); }

  fill(255); textSize(14);
  text(`Score: ${score||0}`, 16, 28);
  text(`Lives: ${lives||3}`, 16, 50);
  if (dashTimer > 0) text(`Dash CD: ${(dashTimer/60).toFixed(1)}s`, 16, 72);
  if (!calibrated) { fill(255, 220); text("Lay flat and click Calibrate for better control.", 16, H - 16); }
  if (gameOver) { drawGameOver(); noLoop(); }
}

function drawGrid() {
  stroke(40);
  for (let x=0; x<=W; x+=60) line(x, 0, x, H);
  for (let y=0; y<=H; y+=60) line(0, y, W, y);
  noStroke();
}

function drawHUD(gx, gy, gz) {
  push(); fill(255); textSize(12);
  const ox = W-200, oy = 24;
  text(`gx: ${nf(gx,1,2)} g`, ox, oy);
  text(`gy: ${nf(gy,1,2)} g`, ox, oy+16);
  text(`gz: ${nf(gz,1,2)} g`, ox, oy+32);
  pop();
}

function rawToG(raw, biasRaw) {
  const delta = raw - biasRaw;           
  const volts = (delta / 1023.0) * vref; 
  return volts / sens;                   
}

function spawnBullet() {
  const edge = floor(random(4));
  let x, y;
  if (edge===0){ x=0; y=random(H); }
  else if (edge===1){ x=W; y=random(H); }
  else if (edge===2){ x=random(W); y=0; }
  else { x=random(W); y=H; }
  const ang = atan2(player.y - y, player.x - x) + random(-0.35, 0.35);
  const speed = random(3.0, 5.0);
  bullets.push({ x, y, vx: speed*cos(ang), vy: speed*sin(ang) });
}

function burst(x, y, gx, gy) {
  if (!port || !port.readable) return; // Only spawn pacman if serial connected
  // Spawn a large yellow pacman-shaped object moving opposite to player velocity
  const speed = 5;
  const pacman = {
    x: x,
    y: y,
    vx: gx * speed, //player.vx * speed,
    vy: gy * speed, //player.vy * speed,
    r: 30,
    angle: 0,
    mouthOpen: true,
    mouthTimer: 0
  };
  pacmen.push(pacman);
}

function drawGameOver() {
  push();
  textAlign(CENTER, CENTER);
  textSize(36); fill(255);
  text("Game Over", W/2, H/2 - 20);
  textSize(18);
  text("Press R to restart", W/2, H/2 + 16);
  pop();
}

function keyPressed() {
  if (key === 'r' || key === 'R') { initGame(); loop(); }
}
