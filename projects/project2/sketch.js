async function createChart(dataUrl = "data/text_counts.json") {

  const response = await fetch(dataUrl);
  const data = await response.json();

  // Specify the chart’s dimensions.
  const width = 1000;
  const height = width;

  // Create the color scale.
  const color = d3.scaleLinear()
      .domain([0, 5])
      //.range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
      .range(["hsl(0, 0.00%, 100.00%)", "hsl(205, 62.10%, 44.50%)"])
      .interpolate(d3.interpolateHcl);

  // Compute the layout.
  const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
    (d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value));
  const root = pack(data);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .attr("style", `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(0)}; cursor: pointer;`);

  // Append the nodes - filter out depth 3 (sent/received) nodes
  const nodeData = root.descendants().slice(1).filter(d => d.depth !== 3);
  const node = svg.append("g")
    .selectAll("g")
    .data(nodeData)
    .join("g")
      .attr("pointer-events", "all")
      .style("cursor", d => (d.children && d.depth < 2) ? "pointer" : "default");
  
  // Add base circle for all nodes
  node.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (d.depth === 2 && d.children) {
          // Person nodes will get pie chart coloring, use white as base
          return "white";
        }
        return d.children ? color(d.depth) : "white";
      })
      .attr("pointer-events", "all");
  
  // Add pie chart arcs for person nodes (depth 2)
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
      
      // Create arc generator with fixed radius
      const radius = d.r;
      const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
      
      // Draw Sent arc (blue) - starts at top (12 o'clock)
      // Arcs are positioned relative to group (0,0), group transform handles positioning
      if (sentValue > 0) {
        group.append("path")
          .attr("class", "sent-arc")
          .attr("d", arc({
            startAngle: -Math.PI / 2,
            endAngle: -Math.PI / 2 + sentAngle
          }))
          .attr("fill", "#1F8AFF");
      }
      
      // Draw Received arc (grey) - continues from Sent
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
  
  // Add event handlers to node groups
  node.on("mouseover", function(event, d) {
        // Add stroke to the circle in this group
        d3.select(this).select("circle").attr("stroke", "#d6e8b7");
        // Show common words and emoji in counts box for hovered year (depth 1) or person (depth 2)
        // New hierarchy: Years > Names > Sent/Received (sent/received not shown as bubbles)
        if (d.depth === 1 || d.depth === 2) {
          updateCommonBox(d);
        }
      })
      .on("mouseout", function(event, d) {
        // Remove stroke from the circle
        d3.select(this).select("circle").attr("stroke", null);
        // Clear counts box on mouse out
        clearCommonBox();
      })
      .on("click", (event, d) => {
        // Only allow zooming if node has children and is at year level or above (depth < 2)
        // New hierarchy: Years > Names > Sent/Received
        // Year nodes are at depth 1, person nodes at depth 2
        if (d.children && d.depth < 2 && focus !== d) {
          zoom(event, d);
          event.stopPropagation();
        }
      });

  // Append the text labels with background boxes.
  const label = svg.append("g")
      .style("font", "14px monospace")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none");

  // Remove existing rect and text appends
  label.selectAll("rect").remove();
  label.selectAll("text").remove();

  // Append rect first so it is behind text
  label.append("rect")
      .attr("fill", "rgb(79, 161, 101)")  // translucent background color for highlight
      .attr("fill-opacity", 0.6)
      .attr("rx", 20)  // rounded corners
      .attr("ry", 20);

  // Append text after rect
  label.append("text")
      .style("fill", "#ffffff")  // text color
      .each(function(d) {
        const textElem = d3.select(this);
        // Compute count for label
        let count = d.data.value;
        if (count === undefined) {
          // Sum descendant leaf values if no direct value
          count = d.descendants().reduce((sum, node) => {
            if (!node.children) return sum + (node.data.value || 0);
            else return sum;
          }, 0);
        }
        // Clear any existing tspans
        textElem.selectAll("tspan").remove();
        // Append name tspan
        textElem.append("tspan")
          .attr("x", 0)
          .attr("dy", "0em")
          .text(d.data.name);
        // Append count tspan on new line
        textElem.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .text(`(${count})`);

        // Adjust background rect size after rendering
        // Calculate width based on text length instead of bbox width
        const textLabel = d.data.name + ` (${count})`;
        const charWidth = 7; // approximate width of one character in pixels for monospace 14px font
        const calculatedWidth = textLabel.length * charWidth;
        const bbox = this.getBBox();
        d3.select(this.parentNode).select("rect")
          .attr("x", bbox.x - (3 * textLabel.length))
          .attr("y", bbox.y - 20)
          .attr("width", bbox.width + (6 * textLabel.length)) // add some padding
          .attr("height", bbox.height + 50);
      });

  // Declare focus and view before usage
  let focus = root;
  let view;

  // Add cumulative counts box group in upper left corner
  const countsBox = svg.append("g")
    .attr("class", "counts-box")
    .attr("transform", `translate(${-width / 2 + 20},${-height / 2 + 20})`);

  countsBox.append("rect")
    .attr("width", 200)
    .attr("height", 440)
    .attr("fill", "#b8e5ff")
    .attr("stroke", "#27380b")
    .attr("stroke-width", 1)
    .attr("rx", 6)
    .attr("ry", 6);

  const countsText = countsBox.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .style("font", "14px monospace")
    .style("fill", "#27380b");

  // Create a group for the bar chart
  const barChartGroup = countsBox.append("g")
    .attr("class", "bar-chart");

  // Function to compute cumulative counts for a node
  function computeCounts(node) {
    if (!node) return { Sent: 0, Received: 0 };
    let counts = { Sent: 0, Received: 0 };

    // Helper recursive function to accumulate counts
    function accumulate(n) {
      if (!n.children) {
        // Leaf node with value
        if (n.parent && n.parent.data.name === "Sent") {
          counts.Sent += n.data.value || 0;
        } else if (n.parent && n.parent.data.name === "Received") {
          counts.Received += n.data.value || 0;
        }
      } else {
        n.children.forEach(accumulate);
      }
    }

    // If node is root "lifetime", accumulate all children
    if (node.data.name === "lifetime") {
      node.children.forEach(accumulate);
    } else if (node.data.name === "Sent" || node.data.name === "Received") {
      // Accumulate all children of Sent or Received
      accumulate(node);
    } else {
      // For other nodes, find if parent is Sent or Received and accumulate accordingly
      if (node.parent && node.parent.data.name === "Sent") {
        counts.Sent = node.data.value || 0;
      } else if (node.parent && node.parent.data.name === "Received") {
        counts.Received = node.data.value || 0;
      } else {
        // For intermediate nodes, accumulate children
        accumulate(node);
      }
    }
    return counts;
  }

  // Function to update counts box text based on current focus
  function updateCountsBox() {
    // Disabled to replace with common words/emoji on hover
  }

  // Initial zoom and counts box update
  zoomTo([focus.x, focus.y, focus.r * 2]);
  updateCountsBox();

  // Create the zoom behavior and zoom immediately in to the initial focus node.
  svg.on("click", (event) => {
    zoom(event, root);
  });

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    // Update circle radius
    node.selectAll("circle").attr("r", d => d.r * k);
    // Update arc paths for person nodes - need to recalculate with new radius
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
        
        // Update or create Sent arc
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
        
        // Update or create Received arc
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

    // Update counts box on zoom
    transition.on("end", () => {
      // Disabled counts box update on zoom
      // updateCountsBox();
    });
  }

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

  // Function to update counts box with common words and emoji for hovered node
  function updateCommonBox(d) {
    countsText.selectAll("tspan").remove();
    barChartGroup.selectAll("*").remove();
    
    let lines = [];
    // Compose header line with Sent/Received, year, person
    let pathNames = [];
    let current = d;
    while (current) {
      pathNames.unshift(current.data.name);
      current = current.parent;
    }
    // pathNames example: ["lifetime", "2021", "Bhavi", "Sent"]
    // New hierarchy: Years > Names > Sent/Received
    // We want Year, Person, Type (Sent/Received)
    if (pathNames.length >= 4) {
      // Full path: lifetime > year > person > sent/received
      lines.push(`Year: ${pathNames[1]}`);
      lines.push(`Person: ${pathNames[2]}`);
      lines.push(`Type: ${pathNames[3]}`);
    } else if (pathNames.length >= 3) {
      // Person node: lifetime > year > person
      lines.push(`Year: ${pathNames[1]}`);
      lines.push(`Person: ${pathNames[2]}`);
    } else if (pathNames.length >= 2) {
      // Year node: lifetime > year
      lines.push(`Year: ${pathNames[1]}`);
    } else {
      lines.push(d.data.name);
    }

    // Display header text
    lines.forEach((line, i) => {
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", 20 + i * 18)
        .text(line);
    });

    const headerHeight = lines.length * 18 + 20;
    const barChartStartY = headerHeight + 10;

    // Aggregate common words/emoji based on node depth, keeping Sent vs Received counts
    const wordCounts = new Map();
    const emojiCounts = new Map();
    
    if (d.depth === 1 && d.children) {
      // Year node: aggregate from all person children and their sent/received children
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
      // Person node: aggregate common words/emoji from sent/received children
      d.children.forEach(child => {
        const type = child.data.name;
        accumulateWordCounts(wordCounts, child.data.common_words, type);
        accumulateEmojiCounts(emojiCounts, child.data.common_emoji, type);
      });
    } else if (d.depth === 3) {
      // Sent/Received node
      accumulateWordCounts(wordCounts, d.data.common_words, d.data.name);
      accumulateEmojiCounts(emojiCounts, d.data.common_emoji, d.data.name);
    } else {
      // Fallback for any other node type with direct common_words
      accumulateWordCounts(wordCounts, d.data.common_words, "Sent");
      accumulateEmojiCounts(emojiCounts, d.data.common_emoji, "Sent");
    }

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

    // Show stacked bar chart for common words if available
    if (wordsData.length > 0) {
      const maxCount = d3.max(wordsData, d => d.total);
      
      // Add "Common Words:" label
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", barChartStartY)
        .text("Common Words:");

      // Create scales for bar chart
      const labelWidth = 50; // Width reserved for word labels
      const barWidth = 130; // Width available for bars (200 - 20 padding - 50 label - some margin)
      const barHeight = 12;
      const barSpacing = 2;
      const xScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, barWidth]);

      // Create bars
      const bars = barChartGroup.selectAll("g.bar")
        .data(wordsData)
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", (d, i) => `translate(10, ${barChartStartY + 20 + i * (barHeight + barSpacing)})`);

      // Add word labels (truncate if too long)
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

      // Add Sent segment
      bars.append("rect")
        .attr("x", labelWidth)
        .attr("width", d => xScale(d.sent))
        .attr("height", barHeight)
        .attr("fill", "#1F8AFF")
        .attr("rx", 2)
        .attr("ry", 2);

      // Add Received segment
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

  // Function to show all-time commonalities (aggregated from root)
  function showAllTimeCommonalities() {
    countsText.selectAll("tspan").remove();
    barChartGroup.selectAll("*").remove();
    
    let lines = [];
    lines.push("All Time");
    
    // Aggregate from all year nodes and their descendants
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
    
    // Display header text
    lines.forEach((line, i) => {
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", 20 + i * 18)
        .text(line);
    });

    const headerHeight = lines.length * 18 + 20;
    const barChartStartY = headerHeight + 10;

    // Show top 10 common words as bar chart if available
    if (wordsData.length > 0) {
      const maxCount = d3.max(wordsData, d => d.total);
      
      // Add "Common Words:" label
      countsText.append("tspan")
        .attr("x", 10)
        .attr("y", barChartStartY)
        .text("Common Words:");

      // Create scales for bar chart
      const labelWidth = 50;
      const barWidth = 130;
      const barHeight = 12;
      const barSpacing = 2;
      const xScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, barWidth]);

      // Create bars
      const bars = barChartGroup.selectAll("g.bar")
        .data(wordsData)
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", (d, i) => `translate(10, ${barChartStartY + 20 + i * (barHeight + barSpacing)})`);

      // Add word labels (truncate if too long)
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

      // Add Sent segment
      bars.append("rect")
        .attr("x", labelWidth)
        .attr("width", d => xScale(d.sent))
        .attr("height", barHeight)
        .attr("fill", "#1F8AFF")
        .attr("rx", 2)
        .attr("ry", 2);

      // Add Received segment
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

  // Function to clear counts box text and restore all-time view
  function clearCommonBox() {
    showAllTimeCommonalities();
  }

  // Show all-time commonalities initially
  showAllTimeCommonalities();

  return svg.node();
}

let chartContainer = null;
let currentSvgNode = null;
let currentRenderToken = 0;

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
  label.textContent = "Exclude common words";
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

  renderChart("data/text_counts.json");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeChart);
} else {
  initializeChart();
}


async function createWebsitesList() {
  // Helper function to parse CSV text into array of objects
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

  // Fetch and parse websites_linked.csv
  const websitesResponse = await fetch('data/websites_linked.csv');
  const websitesText = await websitesResponse.text();
  const websitesData = parseCSV(websitesText);

  // Sort websites by count descending and take top 30
  const topWebsites = websitesData
    .map(d => ({ base_url: d.base_url, count: +d.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Render websites list as horizontal bar chart
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

  // Add y-axis labels (website names)
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-size', '12px')
    .style('cursor', 'pointer');

  // Fetch and parse youtube_title_counts.csv
  const youtubeResponse = await fetch('data/youtube_title_counts.csv');
  const youtubeText = await youtubeResponse.text();
  const youtubeData = parseCSV(youtubeText)
    .map(d => ({ word: d.word, count: +d.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Fetch and parse spotify_artists.csv
  const spotifyResponse = await fetch('data/spotify_artists.csv');
  const spotifyText = await spotifyResponse.text();
  const spotifyData = parseCSV(spotifyText)
    .map(d => ({ artist: d.artist, count: +d.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const dropdown = d3.select('#dropdown-container');

  // Helper to show dropdown as horizontal bar chart
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

  // Helper to hide dropdown
  function hideDropdown() {
    dropdown.html('');
  }

  // Add mouseover and mouseout handlers for top two sites (YouTube and Spotify)
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

createWebsitesList();
