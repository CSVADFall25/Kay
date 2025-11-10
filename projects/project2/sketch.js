async function createChart() {

  const response = await fetch("data/text_counts.json");
  const data = await response.json();

  // Specify the chart’s dimensions.
  const width = 1000;
  const height = width;

  // Create the color scale.
  const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
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

  // Append the nodes.
  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
      .attr("fill", d => d.children ? color(d.depth) : "white")
      .attr("pointer-events", d => !d.children ? "none" : null)
      .on("mouseover", function() { d3.select(this).attr("stroke", "#d6e8b7"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", null); })
      .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

  // Append the text labels with background boxes.
  const label = svg.append("g")
      .style("font", "20px monospace")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none");

  label.append("rect")
      .attr("fill", "#f0f8ff")  // light background color for highlight
      .attr("rx", 4)  // rounded corners
      .attr("ry", 4);

  label.append("text")
      .style("fill", "#27380b")  // text color
      .text(d => d.data.name)
      .each(function() {
        const textElem = this;
        const bbox = textElem.getBBox();
        d3.select(textElem.parentNode).select("rect")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4);
      });

  // Create the zoom behavior and zoom immediately in to the initial focus node.
  svg.on("click", (event) => zoom(event, root));
  let focus = root;
  let view;
  zoomTo([focus.x, focus.y, focus.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
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
  }

  return svg.node();
}

createChart().then(svgNode => {
  const container = document.getElementById('chart-container');
  if (container && svgNode) {
    container.appendChild(svgNode);
  }
});


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
    .attr('fill', 'steelblue')
    .style('cursor', 'pointer');

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

    const width = 250;
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
      .attr('fill', 'orange');

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
