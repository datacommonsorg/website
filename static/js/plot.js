/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require("lodash");
const d3 = require("d3");

// Chart size
const WIDTH = 500;
const HEIGHT = 250;

// Chart margin.
const TOP = 50;
const RIGHT = 230;
const BOTTOM = 50;
const LEFT = 100;

// Label wrap.
const CHAR_PER_LINE = 28;
const WRAP_WIDTH = 200;
const LINE_HEIGHT = 1.1; // ems

/**
 * Wraps svg text into multiple tspan.
 *
 * @param {!d3.selection} textSelection A list of SVG text elements to wrap.
 * @param {number} width The width of wrapped text element.
 */
function wrap(textSelection, width) {
  textSelection.each(function () {
    const text = d3.select(this);
    const words = text.text().split("").reverse();
    let word;
    let line = [];
    const y = text.attr("y");
    const dy = parseFloat(text.attr("dy"));
    let tspan = text
      .text(null)
      .append("tspan")
      .attr("x", 0)
      .attr("y", y)
      .attr("dy", dy + "em");
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(""));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(""));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", LINE_HEIGHT + dy + "em")
          .text(word);
      }
    }
  });
}

/**
 * Draw timeseries chart from an array of observation data series.
 *
 * @param {!Array<!Array<!Object<string, string|number>>>}
 *     seriesArray An array of time series data. Each time series data consists
 *     an array of observation object.
 * @param {string} valueKey A string of the value key.
 * @param {string} selector A string of the svg dom selector.
 */
function drawTimeSeries(seriesArray, valueKey, selector) {
  // Draw the svg.
  const svg = d3
    .select(selector)
    .attr("width", WIDTH + LEFT + RIGHT)
    .attr("height", HEIGHT + TOP + BOTTOM)
    .append("g")
    .attr("transform", `translate(${LEFT},${TOP})`);
  // Set the ranges
  const x = d3.scaleTime().range([0, WIDTH]);
  const y = d3.scaleLinear().range([HEIGHT, 0]);

  // Scale the range of the dataArray
  const flattenData = _.flatten(seriesArray);
  x.domain(d3.extent(flattenData, (d) => d["time"]));

  // TODO(boxu): add unittest.
  const yMax = d3.max(flattenData, (d) => d[valueKey]);
  const yMin = d3.min(flattenData, (d) => d[valueKey]);

  // When yMax and yMin are almost equal, need have a non-zero range for d3 to
  // plot the y axis.
  // If the min value is 0, then always start from it. Otherwise choose a tick
  // range that covers yMin and yMax.
  if (yMax - yMin < 0.0001) {
    if (Math.abs(yMin) < 0.0001) {
      y.domain([0, yMax + 1]);
    } else {
      y.domain([yMin - 1, yMax + 1]);
    }
  } else if (yMin == 0) {
    y.domain([0, yMax]);
  } else if (yMin < 0) {
    y.domain([(yMin * 4 - yMax) / 3, yMax]);
  } else {
    y.domain([Math.max(0, (yMin * 4 - yMax) / 3), yMax]);
  }

  // Define the color.
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // define the line.
  const valueline = d3
    .line()
    .x((d) => x(d["time"]))
    .y((d) => y(d[valueKey]))
    .curve(d3.curveMonotoneX);

  let sample;
  // Loop through each symbol / key
  let totalVLen = 0;
  for (const [i, series] of seriesArray.entries()) {
    if (!series) continue;
    sample = series[0];
    let vText =
      "vText" in sample ? sample["vText"] : sample["measuredProperty"];
    vText = vText.replace(/\//g, "_");
    vText = vText.replace(/\./g, "\\.");

    // Draw path.
    const svgLine = svg
      .append("path")
      .datum(series)
      .attr("class", "line")
      .style("stroke", color(vText))
      .attr("d", valueline);

    // Draw dot.
    svg
      .selectAll("dot-" + vText)
      .data(series)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d["time"]))
      .attr("cy", (d) => y(d[valueKey]))
      .attr("r", 2)
      .style("fill", color(vText))
      .style("stroke", color(vText))
      .on("click", (d) => {
        let uri = new URL(window.location);
        let params = uri.searchParams;
        params.set("dcid", d["dcid"]);
        uri.search = params.toString();
        window.open(uri.toString());
      });

    // Draw plot label.
    let uri = new URL(window.location);
    let params = uri.searchParams;
    params.set("dcid", sample["parentDcid"]);
    uri.search = params.toString();
    const labelX = WIDTH + 15;
    const labelY = totalVLen * 20;
    const svgLabel = svg
      .append("text")
      .attr("class", "plot-label")
      .attr("transform", `translate(${labelX},${labelY})`)
      .attr("dy", ".3em")
      .attr("text-anchor", "start")
      .style("fill", color(vText))
      .text(vText)
      .call(wrap, WRAP_WIDTH)
      .on("click", () => {
        window.open(uri.toString());
      });
    totalVLen += Math.ceil(vText.length / CHAR_PER_LINE);

    // Hover on label and line node should highlight both.
    for (const el of [svgLine, svgLabel]) {
      el.on("mouseover", () => {
        svgLine.node(0).setAttribute("class", "bold-line");
        svgLabel.node(0).setAttribute("font-weight", "bold");
      }).on("mouseleave", () => {
        svgLine.node(0).setAttribute("class", "line");
        svgLabel.node(0).setAttribute("font-weight", "normal");
      });
    }
  }

  // Draw Axis.
  if (sample["observationDate"].match(/\d\d\d\d-\d\d-\d\d/)) {
    // The default ticks for axisBottom for days of the year sometimes have
    // inconsistent format.
    // Explicitly set the format for days of the year using d3.timeFormat.
    // Check observationDate instead of observationPeriod because
    // observationPeriod is missing for some observations.
    svg
      .append("g")
      .attr("transform", `translate(0,${HEIGHT})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %e")));
  } else {
    svg
      .append("g")
      .attr("transform", `translate(0,${HEIGHT})`)
      .call(d3.axisBottom(x));
  }
  if (sample[valueKey] < 10) {
    // TODO(boxu): figure out a way to remove sub ticks.
    svg.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("d")));
  } else {
    // The number of decimals depends on the domain range compared with the
    // Maximum value. When the range is narrow, need more decimals to display
    // the difference.
    let domainDiff = y.domain()[1] - y.domain()[0];
    let decimal = Math.ceil(Math.log10(y.domain()[1] / (domainDiff / 4)));
    svg.append("g").call(
      d3
        .axisLeft(y)
        .ticks(4)
        .tickFormat(d3.format(`.${decimal}s`))
    );
  }

  // The y-label is based on units, mDenoms, and scalingFactors
  // seen so far.
  // As more data is added to Data Commons, this logic may need
  // further fine-tuning.
  // Example in/out:
  // Only unit: USDollar
  // Only StatVar mDenom: As Fraction of Amount_Consumption_Energy
  // Only Property mDenom: Per Area
  // Only scalingFactor: usecase does not exist (Jul 2020)
  //
  // unit + StatVar mDenom: USDollar As Fraction Of GDP
  // unit + Property mDenom: USDollar Per Area
  // StatVar mDenom + scalingFactor=100:  % of Count_Person
  //
  // These combos do not exist yet, but here is what code would yield:
  // StatVar mDenom + scalingFactor!=100: As Fraction of 191 Count_Person
  // unit + StatVar mDenom + scalingFactor: USDollar As Fraction Of 49 GDP
  // unit + Property mDenom + scalingFactor: USDollar Per 49 Area
  let yLabelText = "";
  if (sample["unit"]) {
    yLabelText = sample["unit"];
  }
  if (sample["measurementDenominator"]) {
    let mDenom = sample["measurementDenominator"];
    if (mDenom === "PerCapita") {
      mDenom = "Count_Person";
    }
    if (!yLabelText && parseInt(sample["scalingFactor"]) === 100) {
      // Special case: unitless and scaled by 100: percent.
      yLabelText = "% of " + mDenom;
    } else {
      if (yLabelText) {
        // Prepare to postpend to unit.
        yLabelText += " ";
      }
      if (mDenom[0] === mDenom[0].toUpperCase()) {
        // Case: denominator is a StatVar.
        yLabelText += "As Fraction Of ";
      } else {
        // Case: denominator is a property.
        yLabelText += "Per ";
      }
      if (sample["scalingFactor"]) {
        yLabelText += sample["scalingFactor"] + " ";
      }
      yLabelText += mDenom[0].toUpperCase() + mDenom.slice(1);
    }
  }
  // 2020-07: no case of scalingFactor existing without mDenom.

  // Draw Y label.
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - LEFT)
    .attr("x", 0 - HEIGHT / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(yLabelText, valueKey);
}

/**
 * Function to draw bar chart from observation data.
 *
 * @param {!Array<!Array<!Object<string, string|number>>>}
 *     seriesArray An array of time series data. Each time series data consists
 *     an array of observation object.
 * @param {string} valueKey A string of the value key.
 * @param {string} selector A string of the svg dom selector.
 */
function drawBarChart(seriesArray, valueKey, selector) {
  const series = seriesArray.map((series) => series[0]);
  // Draw the svg.
  const svg = d3
    .select(selector)
    .attr("width", WIDTH + LEFT + RIGHT / 2)
    .attr("height", HEIGHT + TOP + BOTTOM)
    .append("g")
    .attr("transform", `translate(${LEFT},${TOP})`);

  // Set the range.
  const x = d3
    .scaleBand()
    .domain(series.map((d) => d["vText"]))
    .range([0, WIDTH + RIGHT / 2 - LEFT])
    .padding(0.1);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (d) => d[valueKey])])
    .nice()
    .range([HEIGHT, 0]);

  // Plot the rectangle.
  svg
    .selectAll("rect")
    .data(series)
    .enter()
    .append("rect")
    .attr("fill", "steelblue")
    .attr("x", (d) => x(d["vText"]))
    .attr("y", (d) => y(d[valueKey]))
    .attr("height", (d) => Math.abs(y(0) - y(d[valueKey])))
    .attr("width", x.bandwidth())
    .on("click", (d) => {
      let uri = new URL(window.location);
      let params = uri.searchParams;
      params.set("dcid", d["dcid"]);
      uri.search = params.toString();
      window.open(uri.toString());
    });

  const xAxis = (g) =>
    g
      .attr("transform", `translate(0,${HEIGHT})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));
  const yAxis = (g) =>
    g.call(d3.axisLeft(y)).call((g) => g.select(".domain").remove());
  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - LEFT)
    .attr("x", 0 - HEIGHT / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(seriesArray[0][0]["unit"] || "", valueKey);
}

export { drawTimeSeries, drawBarChart };
