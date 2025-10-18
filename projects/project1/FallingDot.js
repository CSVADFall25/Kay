class FallingDot {
  constructor(pointRef, dotsize = 6, color = null) {
    this.point = pointRef;         // reference into drawing array
    this.gravity = 0.3;        // positive -> downward, hardcode/test for now
    this.x_accel = random(-0.05, 0.05); // slight horizontal drift  
    this.radius = dotsize / 2;
    this.color = color;
    this.scale = random(0.8, 1.2); // variety in leaf size
    this.flip = random([-1, 1]); // so we have some variety in leaves left/right

    this.position = createVector(this.point.x, this.point.y);
    this.velocity = createVector(0, 0);
    this.bounceDamping = 0.1;      // 0 = stop at floor, >0 bounce factor
  }

  // simple integrator: v += g ; p += v
  update() {
    // apply constant acceleration (gravity)
    this.velocity.y += this.gravity * random(-0.1, 1.2); // slight variety in fall speed
    this.velocity.x += this.x_accel;
    this.position.add(this.velocity);

    // write back to the referenced point so sketch draws it
    this.point.x = this.position.x;
    this.point.y = this.position.y;
  }

  // keep inside canvas and stop/bounce at bottom
  checkEdges() {
    let floorY = height - this.radius;
    if (this.position.y > floorY) {
      this.velocity.x = 0;
      this.position.y = floorY;
      if (this.bounceDamping > 0) {
        this.velocity.y *= -this.bounceDamping;
      } else {
        this.velocity.y = 0;
      }
      this.point.y = this.position.y;
    }

    if (this.position.x < this.radius) {
      this.position.x = this.radius;
      this.velocity.x *= -1;
      this.point.x = this.position.x;
    } else if (this.position.x > width - this.radius) {
      this.position.x = width - this.radius;
      this.velocity.x *= -1;
      this.point.x = this.position.x;
    }
  }
}