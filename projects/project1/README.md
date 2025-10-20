# Autumn Leaves Drawing Tool

## Project functionality/description
This tool "draws" leaves that fall down onto the canvas floor. Instead of
drawing leaves exactly where the user clicks/drags, the leaves obey physics, 
drift down with gravity and stack on top of each other to create leaf piles. 
Clearing the canvas triggers a cat jumping into the canvas to 
scatter the leaf pile. 

### Design
I gave the leaf object its own class so that I could properly do physics simulations.
I based the design of it on the in-class butterfly force example, and had an update() function to update the location of the leaf each frame as well as a checkEdges() function
to check for collisions with the canvas edges. In checkEdges(), I also added a check to have the leaves check for "collisions" against each other, so that the leaves could give the appearance of stacking on each other to create the leaf piles. In the class constructor,
I made a lot of variables randomly generated within boundaries so that leaves had reasonable variety in size, orientation, and drift speed when spawing on screen. 

The main sketch.js checks for the user's input (mouse interaction) and redraws leaves frame-by-frame. It's responsible for selecting colors, drawing, and clearing the canvas. 

## Process
I wanted to create something that was fall-themed since we're currently in the season.
Though not a tool that falls into the "useful" or "productive" genre, I thought it would be whimsical and fun to do have the users end up drawing leaf piles.

To thwart the user's original expectation, which is that the leaves would end up placed where they click on the canvas, I instead have the leaves spawn and start falling down where the user clicks/drags the mouse as if there's gravity. This creates a more dynamic canvas where the user works with the invisible gravity force to create leaf piles.

I first started with having the user draw dots where a mouse click was, then added a class to give the dots/circles physics. Then I wanted the user to also be able to spawn more dots at an interval with mouse dragging interactions as well, so added capability to spawn a new element every 200ms when the mouse is being dragged. After this, I looked into drawing custom shapes through the bezier curves [https://p5js.org/reference/p5/bezierVertex/] so that I could actually draw leaves rather than circles. I only implemented collisions with the canvas floor first, and then later added collisions with other leaves so that they would be able to stack on each other. Finally, I added the leaf "scattering" animation with the cat jumping into the pile to clear the canvas.

For creating assets, I liked using ColorBuilder [https://colorsails.com/build], so I used it to help me create my fall-themed color palette (see `assets/palette.svg`). I then extracted the raw RGB values into a JSON file (`assets/palette.json`) that the script reads in.
I drew the two cat frames (cat_falling.png & cat.png) in procreate.

## Reflection/Challenges/Outcomes
Getting realistic physics was pretty tricky, and I spent a good amount of time just playing with acceleration values and randomized values in drift. I also had to redraw the leaf bezier curves to get proper leaf-on-leaf overlap and collision, since I originally had the leaf anchored at the upper left (0, 0) but realized I needed its center at (0, 0) to properly detect collisions (otherwise the leaves would seem to stack on air sometimes). I also had to make new class variables to properly save the leaf states; i.e. without a "doneFalling" boolean, the already fallen leaves would sometimes start jittering against each other when new leaves landed on top of them. 

I also particularly wanted to make the canvas clearing animation look more like the cat had jumped into the pile to scatter it, but wasn't able to simulate realistic physics for this part, and the leaves moreso look as if they're just being shot up/away. 

Another thematic goal that I didn't achieve was that I originally wanted to have the color swatches on the left side of the canvas be arranged in the shape of a tree (and add a "trunk" below the swatch area) rather than as a grid, so it appears as if leaf colors are being picked from a tree. However, properly positioning and detecting which swatch was chosen would have been more time consuming in this layout, and I wanted to spend more time on refining the leaf physics instead. 

Overall, working on this tool helped me think more about writing code to animate/draw individual elements while comprising a whole picture (i.e. making each leaf "unique" while still giving all leaves common behaviors such as being subjected to gravity). 