/**
 * Creates and displays a fixed-position legend on the page that explains
 * the color coding for "Sent" and "Received" message counts.
 * The legend is styled as a small box with color swatches and labels.
 * If the legend already exists in the DOM, it does nothing.
 */
function setupSentReceivedLegend() {
  if (document.getElementById("sent-received-legend")) {
    return;
  }

  const legendContainer = document.createElement("div");
  legendContainer.id = "sent-received-legend";
  legendContainer.style.position = "fixed";
  legendContainer.style.right = "20px";
  legendContainer.style.bottom = "20px";
  legendContainer.style.display = "flex";
  legendContainer.style.flexDirection = "column";
  legendContainer.style.gap = "6px";
  legendContainer.style.padding = "10px 14px";
  legendContainer.style.background = "rgba(255, 255, 255, 0.9)";
  legendContainer.style.border = "1px solid #27380b";
  legendContainer.style.borderRadius = "6px";
  legendContainer.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
  legendContainer.style.fontFamily = "monospace";
  legendContainer.style.fontSize = "13px";
  legendContainer.style.color = "#27380b";
  legendContainer.style.zIndex = "10";

  const heading = document.createElement("div");
  heading.textContent = "Message Counts";
  heading.style.fontWeight = "600";
  legendContainer.appendChild(heading);

  const entries = [
    { label: "Sent", color: "#1F8AFF" },
    { label: "Received", color: "#efefef", border: "#27380b" }
  ];

  entries.forEach(entry => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";

    const swatch = document.createElement("span");
    swatch.style.display = "inline-block";
    swatch.style.width = "14px";
    swatch.style.height = "14px";
    swatch.style.borderRadius = "3px";
    swatch.style.background = entry.color;
    if (entry.border) {
      swatch.style.border = `1px solid ${entry.border}`;
    }

    const label = document.createElement("span");
    label.textContent = entry.label;

    row.appendChild(swatch);
    row.appendChild(label);
    legendContainer.appendChild(row);
  });

  document.body.appendChild(legendContainer);
}

/**
 * Creates a packed circle chart visualization of message counts data.
 * The chart shows hierarchical data with years, persons, and sent/received counts.
 * Person nodes (depth 2) display pie chart arcs representing sent vs received proportions.
 * Hovering nodes shows common words and emoji in a side counts box.
 * Clicking zooms into year or person nodes.
 * @param {string} dataUrl - URL to fetch JSON data for the chart.
 * @returns {SVGElement} The SVG element containing the chart.
 */
async function createChart(dataUrl = "data/text_counts.json") {

  const response = await fetch(dataUrl);
  const data = await response.json();

  // Specify the chart’s dimensions.
  const width = 1000;
  const height = width;

  // Create the color scale for node fill based on depth.
  const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["hsl(0, 0.00%, 100.00%)", "hsl(205, 62.10%, 44.50%)"])
      .interpolate(d3.interpolateHcl);

  // Compute the packed circle layout from hierarchical data.
  const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
    (d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value));
  const root = pack(data);

  // Create the SVG container with viewBox centered.
  const svg = d3.create("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .attr("style", `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

  // Select nodes excluding depth 3 (sent/received leaf nodes).
  const nodeData = root.descendants().slice(1).filter(d => d.depth !== 3);
  const node = svg.append("g")
    .selectAll("g")
    .data(nodeData)
    .join("g")
      .attr("pointer-events", "all")
      .style("cursor", d => (d.children && d.depth < 2) ? "pointer" : "default");
  
  // Add base circle for all nodes, color depends on depth and children.
  node.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (d.depth === 2 && d.children) {
          // Person nodes get white base for pie chart arcs.
          return "white";
        }
        return d.children ? color(d.depth) : "white";
      })
      .attr("pointer-events", "all");
  
  // Add pie chart arcs for person nodes (depth 2) showing Sent vs Received proportions.
  node.filter(d => d.depth === 2 && d.children && d.children.length > 0)
    .each(function(d) {
      const group = d3.select(this);
      const sentChild = d.children.find(c => c.data.name === "Sent");
      const receivedChild = d.children.find(c => c.data.name === "Received");
      
      if (!sentChild && !receivedChild) return;
      
      const sentValue = sentChild ? (sentChild.value || 0) : 0;
      const receivedValue = receivedChild ? (receivedChild.value || 0) : 0;
      const total = sentValue + receivedValue;
      
      if (total === 0) return;
      
      const sentAngle = (sentValue / total) * 2 * Math.PI;
      const receivedAngle = (receivedValue / total) * 2 * Math.PI;
      
      // Arc generator for pie slices with radius equal to node radius.
      const radius = d.r;
      const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
      
      // Draw Sent arc (blue) starting at top (12 o'clock).
      if (sentValue > 0) {
        group.append("path")
          .attr("class", "sent-arc")
          .attr("d", arc({
            startAngle: -Math.PI / 2,
            endAngle: -Math.PI / 2 + sentAngle
          }))
          .attr("fill", "#1F8AFF");
      }
      
      // Draw Received arc (grey) continuing from Sent arc.
      if (receivedValue > 0) {
        group.append("path")
          .attr("class", "received-arc")
          .attr("d", arc({
            startAngle: -Math.PI / 2 + sentAngle,
            endAngle: -Math.PI / 2 + sentAngle + receivedAngle
          }))
          .attr("fill", "#efefef");
      }
    });
  
  // Add event handlers for mouseover, mouseout, and click on nodes.
  node.on("mouseover", function(event, d) {
        // Highlight circle stroke on hover.
        d3.select(this).select("circle").attr("stroke", "#d6e8b7");
        // Show common words and emoji in counts box for year or person nodes.
        if (d.depth === 1 || d.depth === 2) {
          updateCommonBox(d);
        }
      })
      .on("mouseout", function(event, d) {
        // Remove highlight stroke.
        d3.select(this).select("circle").attr("stroke", null);
        // Clear counts box on mouse out.
        clearCommonBox();
      })
      .on("click", (event, d) => {
        // Zoom only on nodes with children at year level or above (depth < 2).
        if (d.children && d.depth < 2 && focus !== d) {
          zoom(event, d);
          event.stopPropagation();
        }
      });

  // Append text labels with background boxes for nodes.
  const label = svg.append("g")
      .style("font", "14px monospace")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none");

  // Remove any existing rect and text elements inside labels.
  label.selectAll("rect").remove();
  label.selectAll("text").remove();

  // Append translucent rounded rect behind text for highlight.
  label.append("rect")
      .attr("fill", "rgb(70, 108, 149)")
      .attr("fill-opacity", 0.6)
      .attr("rx", 20)
      .attr("ry", 20);

  // Append text elements with name and count for each node.
  label.append("text")
      .style("fill", "#ffffff")
      .each(function(d) {
        const textElem = d3.select(this);
        // Compute count for label, sum descendants if no direct value.
        let count = d.data.value;
        if (count === undefined) {
          count = d.descendants().reduce((sum, node) => {
            if (!node.children) return sum + (node.data.value || 0);
            else return sum;
          }, 0);
        }
        // Clear existing tspans and append name and count on separate lines.
        textElem.selectAll("tspan").remove();
        textElem.append("tspan")
          .attr("x", 0)
          .attr("dy", "0em")
          .text(d.data.name);
        textElem.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .text(`(${count})`);

        // Adjust background rect size based on text length.
        const textLabel = d.data.name + ` (${count})`;
        const charWidth = 7; // Approximate width per character for monospace 14px font.
        const bbox = this.getBBox();
        d3.select(this.parentNode).select("rect")
          .attr("x", bbox.x - (3 * textLabel.length))
          .attr("y", bbox.y - 20)
          .attr("width", bbox.width + (6 * textLabel.length))
          .attr("height", bbox.height + 50);
      });

  // Variables to track current zoom focus and view.
  let focus = root;
  let view;

  // Add a counts box group in the upper left corner for showing details.
  const countsBox = svg.append("g")
    .attr("class", "counts-box")
    .attr("transform", `translate(${-width / 2 + 20},${-height / 2 + 20})`);

  // Background rectangle for counts box.
  countsBox.append("rect")
    .attr("width", 200)
    .attr("height", 440)
    .attr("fill", "#b8e5ff")
    .attr("stroke", "#27380b")
    .attr("stroke-width", 1)
    .attr("rx", 6)
    .attr("ry", 6);

  // Text element inside counts box for showing info.
  const countsText = countsBox.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .style("font", "14px monospace")
    .style("fill", "#27380b");

  // Group for bar chart inside counts box.
  const barChartGroup = countsBox.append("g")
    .attr("class", "bar-chart");

  /**
   * Computes cumulative Sent and Received counts for a given node.
   * Recursively accumulates counts from leaf nodes based on hierarchy.
   * @param {Object} node - The node to compute counts for.
   * @returns {Object} Object with Sent and Received counts.
   */
  function computeCounts(node) {
    if (!node) return { Sent: 0, Received: 0 };
    let counts = { Sent: 0, Received: 0 };

    // Helper recursive function to accumulate counts.
    function accumulate(n) {
      if (!n.children) {
        if (n.parent && n.parent.data.name === "Sent") {
          counts.Sent += n.data.value || 0;
        } else if (n.parent && n.parent.data.name === "Received") {
          counts.Received += n.data.value || 0;
        }
      } else {
        n.children.forEach(accumulate);
      }
    }

    if (node.data.name === "lifetime") {
      node.children.forEach(accumulate);
    } else if (node.data.name === "Sent" || node.data.name === "Received") {
      accumulate(node);
    } else {
      if (node.parent && node.parent.data.name === "Sent") {
        counts.Sent = node.data.value || 0;
      } else if (node.parent && node.parent.data.name === "Received") {
        counts.Received = node.data.value || 0;
      } else {
        accumulate(node);
      }
    }
    return counts;
  }

  // Placeholder function for updating counts box text (disabled).
  function updateCountsBox() {
    // Disabled to replace with common words/emoji on hover
  }

  // Initial zoom to root node and update counts box.
  zoomTo([focus.x, focus.y, focus.r * 2]);
  updateCountsBox();

  // Zoom behavior on SVG click to zoom out to root.
  svg.on("click", (event) => {
    zoom(event, root);
  });

  /**
   * Zooms the chart view to a specified position and scale.
   * Updates node positions, circle radii, and pie chart arcs accordingly.
   * @param {Array} v - Array [x, y, diameter] defining zoom focus and scale.
   */
  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.selectAll("circle").attr("r", d => d.r * k);

    // Update pie chart arcs for person nodes with new radius.
    node.filter(d => d.depth === 2 && d.children && d.children.length > 0)
      .each(function(d) {
        const group = d3.select(this);
        const sentChild = d.children.find(c => c.data.name === "Sent");
        const receivedChild = d.children.find(c => c.data.name === "Received");
        
        if (!sentChild && !receivedChild) return;
        
        const sentValue = sentChild ? (sentChild.value || 0) : 0;
        const receivedValue = receivedChild ? (receivedChild.value || 0) : 0;
        const total = sentValue + receivedValue;
        
        if (total === 0) return;
        
        const sentAngle = (sentValue / total) * 2 * Math.PI;
        const receivedAngle = (receivedValue / total) * 2 * Math.PI;
        const radius = d.r * k;
        
        const arc = d3.arc()
          .innerRadius(0)
          .outerRadius(radius);
        
        let sentPath = group.select("path.sent-arc");
        if (sentValue > 0) {
          if (sentPath.empty()) {
            sentPath = group.append("path").attr("class", "sent-arc").attr("fill", "#1F8AFF");
          }
          sentPath.attr("d", arc({
            startAngle: -Math.PI / 2,
            endAngle: -Math.PI / 2 + sentAngle
          }));
        } else {
          sentPath.remove();
        }
        
        let receivedPath = group.select("path.received-arc");
        if (receivedValue > 0) {
          if (receivedPath.empty()) {
            receivedPath = group.append("path").attr("class", "received-arc").attr("fill", "white");
          }
          receivedPath.attr("d", arc({
            startAngle: -Math.PI / 2 + sentAngle,
            endAngle: -Math.PI / 2 + sentAngle + receivedAngle
          }));
        } else {
          receivedPath.remove();
        }
      });
  }

  /**
   * Handles zoom transition to a new focus node.
   * Animates zoom and updates label visibility.
   * @param {Event} event - The triggering event.
   * @param {Object} d - The node to zoom to.
   */
  function zoom(event, d) {
    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", d => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return t => zoomTo(i(t));
        });

    label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });

    // Disabled counts box update on zoom.
    transition.on("end", () => {
      // updateCountsBox();
    });
  }

  /**
   * Accumulates word counts into a map for Sent and Received types.
   * @param {Map} map - Map to accumulate counts into.
   * @param {Array} words - Array of [word, count] pairs.
   * @param {string} type - "Sent" or "Received" or other.
   */
  function accumulateWordCounts(map, words, type) {
    if (!words) return;
    words.forEach(([word, count]) => {
      if (!word) return;
      if (!map.has(word)) {
        map.set(word, { Sent: 0, Received: 0 });
      }
      const entry = map.get(word);
      const value = Number(count) || 0;
      if (type === "Sent" || type === "Received") {
        entry[type] += value;
      } else {
        entry.Sent += value;
      }
    });
  }

  /**
   * Accumulates emoji counts into a map for Sent and Received types.
   * @param {Map} map - Map to accumulate counts into.
   * @param {Array|string} emoji - Emoji data, either array [symbol, count] or string.
   * @param {string} type - "Sent" or "Received" or other.
   */
  function accumulateEmojiCounts(map, emoji, type) {
    if (!emoji) return;
    let symbol;
    let count;
    if (Array.isArray(emoji) && emoji.length >= 1) {
      symbol = emoji[0];
      count = Number(emoji[1]) || 1;
    } else {
      symbol = emoji;
      count = 1;
    }
    if (symbol) {
      if (!map.has(symbol)) {
        map.set(symbol, { Sent: 0, Received: 0 });
      }
      const entry = map.get(symbol);
      if (type === "Sent" || type === "Received") {
        entry[type] += count;
      } else {
        entry.Sent += count;
      }
    }
  }

  /**
   * Appends labels showing total counts on stacked bar chart bars.
   * Positions labels inside or outside bars based on space.
   * @param {d3.Selection} barSelection - Selection of bar groups.
   * @param {Function} xScale - Scale function for bar widths.
   * @param {number} labelWidth - Width reserved for word labels.
   * @param {number} barHeight - Height of each bar.
   */
  function appendStackedBarLabels(barSelection, xScale, labelWidth, barHeight) {
    const padding = 6;
    barSelection.append("text")
      .attr("class", "bar-label")
      .attr("y", barHeight / 2)
      .attr("dy", "0.35em")
      .style("font", "10px monospace")
      .style("pointer-events", "none")
      .text(d => d.total)
      .each(function(d) {
        const text = d3.select(this);
        const labelText = text.text();
        const estimatedTextWidth = labelText.length * 6;
        const sentWidth = xScale(d.sent);
        const receivedWidth = xScale(d.received);
        const totalWidth = xScale(d.total);

        if (receivedWidth >= estimatedTextWidth + padding) {
          text
            .attr("x", labelWidth + sentWidth + receivedWidth - 3)
            .attr("text-anchor", "end")
            .style("fill", "#27380b");
        } else {
          text
            .attr("x", labelWidth + totalWidth + 5)
            .attr("text-anchor", "start")
            .style("fill", "#27380b");
        }
      });
  }

  /**
   * Updates the counts box with common words and emoji for the hovered node.
   * Aggregates data based on node depth and displays stacked bar chart and emoji info.
   * @param {Object} d - The hovered node.
   */
  function updateCommonBox(d) {
    countsText.selectAll("tspan").remove();
    barChartGroup.selectAll("*").remove();
    
    let lines = [];
    // Compose header line with Year, Person, and Type (Sent/Received) based on node path.
    let pathNames = [];
    let current = d;
    while (current) {
      pathNames.unshift(current.data.name);
      current = current.parent;
    }
    if (pathNames.length >= 4) {
      lines.push(`Year: ${pathNames[1]}`);
      lines.push(`Person: ${pathNames[2]}`);
      lines.push(`Type: ${pathNames[3]}`);
    } else if (pathNames.length >= 3) {
      lines.push(`Year: ${pathNames[1]}`);
      lines.push(`Person: ${pathNames[2]}`);
    } else if (pathNames.length >= 2) {
      lines.push(`Year: ${pathNames[1]}`);
    } else {
      lines.push(d.data.name);
    }

    // Display header text lines.
    lines.forEach((line, i) => {
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", 20 + i * 18)
        .text(line);
    });

    const headerHeight = lines.length * 18 + 20;
    const barChartStartY = headerHeight + 10;

    // Aggregate common words and emoji counts based on node depth.
    const wordCounts = new Map();
    const emojiCounts = new Map();
    
    if (d.depth === 1 && d.children) {
      // Year node: aggregate from all person children and their sent/received children.
      d.children.forEach(personChild => {
        if (personChild.children) {
          personChild.children.forEach(sentReceivedChild => {
            const type = sentReceivedChild.data.name;
            accumulateWordCounts(wordCounts, sentReceivedChild.data.common_words, type);
            accumulateEmojiCounts(emojiCounts, sentReceivedChild.data.common_emoji, type);
          });
        }
      });
    } else if (d.depth === 2 && d.children) {
      // Person node: aggregate from sent/received children.
      d.children.forEach(child => {
        const type = child.data.name;
        accumulateWordCounts(wordCounts, child.data.common_words, type);
        accumulateEmojiCounts(emojiCounts, child.data.common_emoji, type);
      });
    } else if (d.depth === 3) {
      // Sent/Received node: accumulate directly.
      accumulateWordCounts(wordCounts, d.data.common_words, d.data.name);
      accumulateEmojiCounts(emojiCounts, d.data.common_emoji, d.data.name);
    } else {
      // Fallback: accumulate as Sent.
      accumulateWordCounts(wordCounts, d.data.common_words, "Sent");
      accumulateEmojiCounts(emojiCounts, d.data.common_emoji, "Sent");
    }

    // Prepare data for top common words sorted by total count.
    const wordsData = Array.from(wordCounts.entries())
      .map(([word, counts]) => {
        const sent = counts.Sent || 0;
        const received = counts.Received || 0;
        return {
          word,
          sent,
          received,
          total: sent + received
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    // Find top Sent and Received emoji by count.
    let topSentEmoji = null;
    let topReceivedEmoji = null;
    emojiCounts.forEach((counts, symbol) => {
      if (counts.Sent > 0) {
        if (!topSentEmoji || counts.Sent > topSentEmoji.count) {
          topSentEmoji = { symbol, count: counts.Sent };
        }
      }
      if (counts.Received > 0) {
        if (!topReceivedEmoji || counts.Received > topReceivedEmoji.count) {
          topReceivedEmoji = { symbol, count: counts.Received };
        }
      }
    });

    // Display stacked bar chart for common words if available.
    if (wordsData.length > 0) {
      const maxCount = d3.max(wordsData, d => d.total);
      
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", barChartStartY)
        .text("Common Words:");

      const labelWidth = 50;
      const barWidth = 130;
      const barHeight = 12;
      const barSpacing = 2;
      const xScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, barWidth]);

      const bars = barChartGroup.selectAll("g.bar")
        .data(wordsData)
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", (d, i) => `translate(10, ${barChartStartY + 20 + i * (barHeight + barSpacing)})`);

      bars.append("text")
        .attr("x", 0)
        .attr("y", barHeight / 2)
        .attr("dy", "0.35em")
        .style("font", "10px monospace")
        .style("fill", "#27380b")
        .text(d => {
          const word = d.word;
          return word.length > 8 ? word.substring(0, 7) + "…" : word;
        })
        .style("pointer-events", "none");

      bars.append("rect")
        .attr("x", labelWidth)
        .attr("width", d => xScale(d.sent))
        .attr("height", barHeight)
        .attr("fill", "#1F8AFF")
        .attr("rx", 2)
        .attr("ry", 2);

      bars.append("rect")
        .attr("x", d => labelWidth + xScale(d.sent))
        .attr("width", d => xScale(d.received))
        .attr("height", barHeight)
        .attr("fill", "#efefef")
        .attr("rx", 2)
        .attr("ry", 2);

      appendStackedBarLabels(bars, xScale, labelWidth, barHeight);

      const emojiLabelY = barChartStartY + 20 + wordsData.length * (barHeight + barSpacing) + 25;
      const emojiSentY = emojiLabelY + 18;
      const emojiReceivedY = emojiSentY + 18;

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiLabelY)
        .text("Most Common Emoji:");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiSentY)
        .text(topSentEmoji ? `Sent: ${topSentEmoji.symbol} (${topSentEmoji.count})` : "Sent: None");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiReceivedY)
        .text(topReceivedEmoji ? `Received: ${topReceivedEmoji.symbol} (${topReceivedEmoji.count})` : "Received: None");
    } else {
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", barChartStartY)
        .text("No common words");
      
      const emojiLabelY = barChartStartY + 18;
      const emojiSentY = emojiLabelY + 18;
      const emojiReceivedY = emojiSentY + 18;

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiLabelY)
        .text("Most Common Emoji:");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiSentY)
        .text(topSentEmoji ? `Sent: ${topSentEmoji.symbol} (${topSentEmoji.count})` : "Sent: None");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiReceivedY)
        .text(topReceivedEmoji ? `Received: ${topReceivedEmoji.symbol} (${topReceivedEmoji.count})` : "Received: None");
    }
  }

  /**
   * Shows all-time common words and emoji aggregated from the root node.
   * Clears and updates the counts box with overall data.
   */
  function showAllTimeCommonalities() {
    countsText.selectAll("tspan").remove();
    barChartGroup.selectAll("*").remove();
    
    let lines = [];
    lines.push("All Time");
    
    const wordCounts = new Map();
    const emojiCounts = new Map();
    
    root.children.forEach(yearChild => {
      if (yearChild.children) {
        yearChild.children.forEach(personChild => {
          if (personChild.children) {
            personChild.children.forEach(sentReceivedChild => {
              const type = sentReceivedChild.data.name;
              accumulateWordCounts(wordCounts, sentReceivedChild.data.common_words, type);
              accumulateEmojiCounts(emojiCounts, sentReceivedChild.data.common_emoji, type);
            });
          }
        });
      }
    });
    
    const wordsData = Array.from(wordCounts.entries())
      .map(([word, counts]) => {
        const sent = counts.Sent || 0;
        const received = counts.Received || 0;
        return {
          word,
          sent,
          received,
          total: sent + received
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
    
    let topSentEmoji = null;
    let topReceivedEmoji = null;
    emojiCounts.forEach((counts, symbol) => {
      if (counts.Sent > 0) {
        if (!topSentEmoji || counts.Sent > topSentEmoji.count) {
          topSentEmoji = { symbol, count: counts.Sent };
        }
      }
      if (counts.Received > 0) {
        if (!topReceivedEmoji || counts.Received > topReceivedEmoji.count) {
          topReceivedEmoji = { symbol, count: counts.Received };
        }
      }
    });
    
    lines.forEach((line, i) => {
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", 20 + i * 18)
        .text(line);
    });

    const headerHeight = lines.length * 18 + 20;
    const barChartStartY = headerHeight + 10;

    if (wordsData.length > 0) {
      const maxCount = d3.max(wordsData, d => d.total);
      
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", barChartStartY)
        .text("Common Words:");

      const labelWidth = 50;
      const barWidth = 130;
      const barHeight = 12;
      const barSpacing = 2;
      const xScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, barWidth]);

      const bars = barChartGroup.selectAll("g.bar")
        .data(wordsData)
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", (d, i) => `translate(10, ${barChartStartY + 20 + i * (barHeight + barSpacing)})`);

      bars.append("text")
        .attr("x", 0)
        .attr("y", barHeight / 2)
        .attr("dy", "0.35em")
        .style("font", "10px monospace")
        .style("fill", "#27380b")
        .text(d => {
          const word = d.word;
          return word.length > 8 ? word.substring(0, 7) + "…" : word;
        })
        .style("pointer-events", "none");

      bars.append("rect")
        .attr("x", labelWidth)
        .attr("width", d => xScale(d.sent))
        .attr("height", barHeight)
        .attr("fill", "#1F8AFF")
        .attr("rx", 2)
        .attr("ry", 2);

      bars.append("rect")
        .attr("x", d => labelWidth + xScale(d.sent))
        .attr("width", d => xScale(d.received))
        .attr("height", barHeight)
        .attr("fill", "#efefef")
        .attr("rx", 2)
        .attr("ry", 2);

      appendStackedBarLabels(bars, xScale, labelWidth, barHeight);

      const emojiLabelY = barChartStartY + 20 + wordsData.length * (barHeight + barSpacing) + 25;
      const emojiSentY = emojiLabelY + 18;
      const emojiReceivedY = emojiSentY + 18;

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiLabelY)
        .text("Most Common Emoji:");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiSentY)
        .text(topSentEmoji ? `Sent: ${topSentEmoji.symbol} (${topSentEmoji.count})` : "Sent: None");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiReceivedY)
        .text(topReceivedEmoji ? `Received: ${topReceivedEmoji.symbol} (${topReceivedEmoji.count})` : "Received: None");
    } else {
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", barChartStartY)
        .text("No common words");
      
      const emojiLabelY = barChartStartY + 18;
      const emojiSentY = emojiLabelY + 18;
      const emojiReceivedY = emojiSentY + 18;

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiLabelY)
        .text("Most Common Emoji:");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiSentY)
        .text(topSentEmoji ? `Sent: ${topSentEmoji.symbol} (${topSentEmoji.count})` : "Sent: None");

      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", emojiReceivedY)
        .text(topReceivedEmoji ? `Received: ${topReceivedEmoji.symbol} (${topReceivedEmoji.count})` : "Received: None");
    }
  }

  /**
   * Clears the counts box and restores the all-time commonalities view.
   */
  function clearCommonBox() {
    showAllTimeCommonalities();
  }

  // Show all-time commonalities initially.
  showAllTimeCommonalities();

  return svg.node();
}

let chartContainer = null;
let currentSvgNode = null;
let currentRenderToken = 0;

/**
 * Renders the chart SVG inside the chart container element.
 * Uses a render token to avoid race conditions with async rendering.
 * @param {string} dataUrl - URL to fetch data for the chart.
 */
async function renderChart(dataUrl) {
  if (!chartContainer) return;
  const token = ++currentRenderToken;

  try {
    const svgNode = await createChart(dataUrl);

    if (token !== currentRenderToken) {
      return;
    }

    if (currentSvgNode && currentSvgNode.parentNode === chartContainer) {
      chartContainer.removeChild(currentSvgNode);
    }

    currentSvgNode = svgNode;
    chartContainer.appendChild(svgNode);
  } catch (error) {
    console.error("Failed to render chart:", error);
  }
}

/**
 * Sets up a fixed-position toggle checkbox to exclude common filler words
 * from the chart data. When toggled, it re-renders the chart with filtered data.
 * @returns {HTMLInputElement} The checkbox input element.
 */
function setupCommonWordsToggle() {
  if (document.getElementById("exclude-common-words-toggle")) {
    return document.getElementById("exclude-common-words-checkbox");
  }

  const toggleContainer = document.createElement("div");
  toggleContainer.id = "exclude-common-words-toggle";
  toggleContainer.style.position = "fixed";
  toggleContainer.style.left = "20px";
  toggleContainer.style.bottom = "20px";
  toggleContainer.style.display = "flex";
  toggleContainer.style.alignItems = "center";
  toggleContainer.style.gap = "10px";
  toggleContainer.style.padding = "10px 14px";
  toggleContainer.style.background = "rgba(255, 255, 255, 0.9)";
  toggleContainer.style.border = "1px solid #27380b";
  toggleContainer.style.borderRadius = "6px";
  toggleContainer.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
  toggleContainer.style.zIndex = "10";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "exclude-common-words-checkbox";

  const label = document.createElement("label");
  label.setAttribute("for", checkbox.id);
  label.textContent = "Exclude common filler words (like, lol, lmao, etc.)";
  label.style.fontFamily = "monospace";
  label.style.fontSize = "14px";
  label.style.color = "#27380b";

  toggleContainer.appendChild(checkbox);
  toggleContainer.appendChild(label);
  document.body.appendChild(toggleContainer);

  checkbox.addEventListener("change", () => {
    const dataSource = checkbox.checked
      ? "data/text_counts_no_common_words.json"
      : "data/text_counts.json";
    renderChart(dataSource);
  });

  return checkbox;
}

/**
 * Initializes the chart by setting up the container, toggle, legend,
 * and rendering the initial chart.
 */
function initializeChart() {
  chartContainer = document.getElementById("chart-container");
  if (!chartContainer) {
    console.warn("Chart container not found.");
    return;
  }

  const toggleCheckbox = setupCommonWordsToggle();
  if (toggleCheckbox) {
    toggleCheckbox.checked = false;
  }

  setupSentReceivedLegend();

  renderChart("data/text_counts.json");
}

// Initialize chart on DOM ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeChart);
} else {
  initializeChart();
}

/**
 * Creates and renders a horizontal bar chart list of top websites linked.
 * Also fetches and prepares YouTube video topics and Spotify artists data
 * for dropdown display on mouseover.
 */
async function createWebsitesList() {
  // Helper function to parse CSV text into array of objects.
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const cols = line.split(',');
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = cols[i];
      });
      return obj;
    });
  }

  // Fetch and parse websites_linked.csv.
  const websitesResponse = await fetch('data/websites_linked.csv');
  const websitesText = await websitesResponse.text();
  const websitesData = parseCSV(websitesText);

  // Sort websites by count descending and take top 30.
  const topWebsites = websitesData
    .map(d => ({ base_url: d.base_url, count: +d.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Render websites list as horizontal bar chart.
  const websitesList = d3.select('#websites-list');
  websitesList.html(''); // clear existing content

  const width = 300;
  const barHeight = 20;
  const margin = { top: 20, right: 30, bottom: 20, left: 150 };
  const height = barHeight * topWebsites.length + margin.top + margin.bottom;

  const svg = websitesList.append('svg')
    .attr('width', width)
    .attr('height', height);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topWebsites, d => d.count)])
    .range([0, width - margin.left - margin.right]);

  const y = d3.scaleBand()
    .domain(topWebsites.map(d => d.base_url))
    .range([margin.top, height - margin.bottom])
    .padding(0.1);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},0)`);

  g.selectAll('rect')
    .data(topWebsites)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', d => y(d.base_url))
    .attr('width', d => x(d.count))
    .attr('height', y.bandwidth())
    .attr('fill', d => {
      if (d.base_url.includes('spotify')) {
        return '#b8e5ff'; // same as dropdown spotify bars
      } else if (d.base_url.includes('youtu')) {
        return '#b8e5ff'; // same as dropdown youtube bars
      } else {
        return '#1F8AFF';
      }
    })
    .style('cursor', d => (d.base_url.includes('spotify') || d.base_url.includes('youtu')) ? 'pointer' : 'default');

  g.selectAll('text.count')
    .data(topWebsites)
    .enter()
    .append('text')
    .attr('class', 'count')
    .attr('x', d => x(d.count) + 5)
    .attr('y', d => y(d.base_url) + y.bandwidth() / 2)
    .attr('dy', '0.3em')
    .text(d => d.count);

  // Add y-axis labels (website names).
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-size', '12px')
    .style('cursor', 'pointer');

  // Fetch and parse youtube_title_counts.csv.
  const youtubeResponse = await fetch('data/youtube_title_counts.csv');
  const youtubeText = await youtubeResponse.text();
  const youtubeData = parseCSV(youtubeText)
    .map(d => ({ word: d.word, count: +d.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Fetch and parse spotify_artists.csv.
  const spotifyResponse = await fetch('data/spotify_artists.csv');
  const spotifyText = await spotifyResponse.text();
  const spotifyData = parseCSV(spotifyText)
    .map(d => ({ artist: d.artist, count: +d.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const dropdown = d3.select('#dropdown-container');

  /**
   * Shows a dropdown horizontal bar chart for given items.
   * @param {Array} items - Data items to display.
   * @param {string} labelKey - Key for label in items.
   * @param {string} labelText - Header text for dropdown.
   */
  function showDropdown(items, labelKey, labelText) {
    dropdown.style('display', 'block');
    dropdown.html('');
    dropdown.append('h4').text(labelText);

    const width = 260;
    const barHeight = 16;
    const margin = { top: 12, right: 20, bottom: 20, left: 120 };
    const height = barHeight * items.length + margin.top + margin.bottom;

    const svg = dropdown.append('svg')
      .attr('width', width)
      .attr('height', height);

    const x = d3.scaleLinear()
      .domain([0, d3.max(items, d => d.count)])
      .range([0, width - margin.left - margin.right]);

    const y = d3.scaleBand()
      .domain(items.map(d => d[labelKey]))
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},0)`);

    g.selectAll('rect')
      .data(items)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', d => y(d[labelKey]))
      .attr('width', d => x(d.count))
      .attr('height', y.bandwidth())
      .attr('fill', '#b8e5ff');

    g.selectAll('text.count')
      .data(items)
      .enter()
      .append('text')
      .attr('class', 'count')
      .attr('x', d => x(d.count) + 5)
      .attr('y', d => y(d[labelKey]) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .text(d => d.count);

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '12px');
  }

  // Hides the dropdown content.
  function hideDropdown() {
    dropdown.html('');
  }

  // Add mouseover and mouseout handlers for top two sites (YouTube and Spotify).
  svg.selectAll('rect')
    .on('mouseover', function(event, d) {
      if (d.base_url.includes('youtu')) {
        showDropdown(youtubeData, 'word', 'Most Sent Video Topics');
      } else if (d.base_url.includes('spotify')) {
        showDropdown(spotifyData, 'artist', 'Most Sent Artists');
      } else {
        hideDropdown();
      }
    })
    .on('mouseout', function(event, d) {
      hideDropdown();
    });
}

// Immediately invoke to create the websites list visualization.
createWebsitesList();
