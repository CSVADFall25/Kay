/*
Class for the drawn leaf objects
Implements:
- Physics for the leaf objects (gravity, drift, stacking on top of each other)
- Some randomness in each leaf's size, orientation, and drift speed for variety

References/Help Used:
- Used the CSVAD25_examples/motion/forces_animation for general Leaf class structure
- ChatGPT helped with the checkEdges function, particularly for leaf stacking behavior
*/

class Leaf {
  constructor(pointRef, size, color = null) {
    this.point = pointRef; // reference into the main sketch's drawing array

    // most randomized lower/upper bounds below were chosen from visual experimentation
    this.gravity = 0.3; // positive -> downward, 0.3 chosen from playing with values
    this.x_accel = random(-0.05, 0.05); // slight horizontal drift  
    this.radius = size / 2; // rough radius of leaf, used for collision/stacking
    this.color = color;
    this.scale = random(0.9, 1.5); // variety in leaf size
    this.flip = random([-1, 1]); // spawn leaves both left/right mirrored
    this.rotate = random(-PI/9, PI/9) // variety in orientation

    this.position = createVector(this.point.x, this.point.y);
    this.velocity = createVector(0, 0);
    this.bounceDamping = 0.1; // slightest bounce when hitting ground

    this.doneFalling = false; // stops leaves from moving once settled on ground
  }

  update() {
    // don't modify position if done falling
    if (this.doneFalling) {
      return;
    }

    // apply acceleration
    this.velocity.y += this.gravity * random(-0.1, 1.2); // gravity + slight variety in fall speed frame to frame
    this.velocity.x += this.x_accel; // horizontal drift
    this.position.add(this.velocity);

    // write back to the referenced point so sketch draws it
    this.point.x = this.position.x;
    this.point.y = this.position.y;
  }

  // keep inside canvas and stop/bounce at bottom
  checkEdges(otherLeaves) {
    // no need to modify position if done falling
    if (this.doneFalling) {
      return;
    }

    // to visually stack leaves, check the distance between other leaves that are done falling
    for (let leaf of otherLeaves) {
      if (leaf != this) {
        let distVec = p5.Vector.sub(this.position, leaf.position);
        let dist = distVec.mag();
        let minDist = this.radius * 1.2; // playing around with this value for degree of overlap 
        // if within the min distance, stop moving and let leaf settle
        if (dist < minDist && leaf.doneFalling) {
          this.velocity.y = 0;
          this.doneFalling = true;
          return;
        }
      }
    }

    // leaf didn't hit another leaf, now check for floor collision
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

      // if velocity is very small, consider leaf done falling
      // stops the leaf from jittering on the ground
      if (this.velocity.y < 0.01 && this.velocity.y > -0.01) {
        this.doneFalling = true;
      }
    }
    
    // also stop leaves from going off left/right edges of canvas
    // hardcoded the left canvas edge to 275 to account for the palette area
    if (this.position.x < 275 + this.radius) {
      this.position.x = 275 + this.radius;
      this.velocity.x *= -1;
      this.point.x = this.position.x;
    } else if (this.position.x > width - this.radius) {
      this.position.x = width - this.radius;
      this.velocity.x *= -1;
      this.point.x = this.position.x;
    }
  }

  // only check bottom edges for scattering up animation
  checkBottomEdges(otherLeaves) {
    // no need to modify position if done falling
    if (this.doneFalling) {
      return;
    }

    // leaf didn't hit another leaf, now check for floor collision
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

      // if velocity is very small, consider leaf done falling
      // stops the leaf from jittering on the ground
      if (this.velocity.y < 0.01 && this.velocity.y > -0.01) {
        this.doneFalling = true;
      }
    }
  }

  // call to make leaf fly back up
  // used for the cleaning canvas animation to make it look like
  // the cat jumped onto the leaf pile and scattered them back up
  flyUp() {
    this.doneFalling = false;
    // randomness to make leaves go up at different angles/speeds
    this.velocity = createVector(random(-8, 8), random(-5, -8));
    this.gravity = -5; // negative gravity to go up
    this.x_accel = random(-8, 8); 
  }
}
