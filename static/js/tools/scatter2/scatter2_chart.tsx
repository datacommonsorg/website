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

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import { Container, Row, Card, Badge } from "reactstrap";
import * as d3 from "d3";
import { saveToFile } from "../../shared/util";
import { getTimeSeriesLatestPoint } from "./scatter2_util";
import { Spinner } from "./scatter2_spinner";
import {
  Context,
  NamedPlace,
  setData,
  setPopulations,
  ContextFieldType,
  Axis,
  Place,
} from "./scatter2_context";

interface Point {
  xVal: number;
  yVal: number;
  xPop: number;
  yPop: number;
  place: NamedPlace;
}

// TODO: Show provenance.
function Chart(): JSX.Element {
  const context = useContext(Context);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const place = context.place.value;
    if (!arePlacesLoaded(place)) {
      return;
    }
    const x = context.x;
    const y = context.y;
    if (!isStatVarNameLoaded(x.value) || !isStatVarNameLoaded(y.value)) {
      return;
    }
    setLoading(true);
    loadPopulationsAndDataIfNeeded(x, place);
    loadPopulationsAndDataIfNeeded(y, place);
    if (!arePopulationsAndDataLoaded(x.value, y.value)) {
      return;
    }

    const lower = place.lowerBound;
    const upper = place.upperBound;
    const points: Array<Point> = _.zip(
      x.value.data,
      y.value.data,
      x.value.populations,
      y.value.populations,
      place.enclosedPlaces
    )
      .filter(
        ([xVal, yVal, xPop, yPop]) =>
          xVal !== undefined &&
          yVal !== undefined &&
          xPop !== undefined &&
          yPop !== undefined &&
          isBetween(xPop, lower, upper) &&
          isBetween(yPop, lower, upper)
      )
      .map(([xVal, yVal, xPop, yPop, placeName]) => ({
        xVal: x.value.perCapita ? xVal / xPop : xVal,
        yVal: y.value.perCapita ? yVal / yPop : yVal,
        xPop: xPop,
        yPop: yPop,
        place: placeName,
      }));
    setLoading(false);
    plot(points, x.value, y.value);
    updateStats(points);

    const downloadButton = document.getElementById("download-link");
    if (downloadButton) {
      downloadButton.style.visibility = "visible";
      downloadButton.onclick = () => downloadData(x.value, y.value, place);
    }
  }, [context]);

  return (
    <Container id="chart">
      <Row>
        <Card id="chart-svg" className="chart-svg" />
      </Row>
      <Row>
        <Card id="stats">
          <Badge color="light">
            X Mean: <span id="x-mean">N/A</span>
          </Badge>
          <Badge color="light">
            Y Mean: <span id="y-mean">N/A</span>
          </Badge>
          <Badge color="light">
            X Standard Deviation: <span id="x-std">N/A</span>
          </Badge>
          <Badge color="light">
            Y Standard Deviation: <span id="y-std">N/A</span>
          </Badge>
        </Card>
      </Row>
      <Spinner isOpen={loading} />
    </Container>
  );
}

function arePlacesLoaded(place: Place): boolean {
  return (
    place.enclosedPlaceType &&
    place.enclosingPlace.dcid &&
    !_.isEmpty(place.enclosedPlaces)
  );
}

function isStatVarNameLoaded(axis: Axis): boolean {
  return !_.isEmpty(axis.name);
}

function arePopulationsAndDataLoaded(x: Axis, y: Axis): boolean {
  return (
    !_.isEmpty(x.data) &&
    !_.isEmpty(y.data) &&
    !_.isEmpty(x.populations) &&
    !_.isEmpty(y.populations)
  );
}

function downloadData(x: Axis, y: Axis, place: Place): void {
  if (!arePopulationsAndDataLoaded(x, y)) {
    alert("Sorry, still retrieving data. Please try again later.");
    return;
  }

  const xStatVar = _.findKey(x.statVar);
  const yStatVar = _.findKey(y.statVar);
  // Headers
  let csv =
    `xValue-${xStatVar},` +
    `yValue-${yStatVar},` +
    `${x.statVar[xStatVar].denominators[0] || "xPopulation-Count_Person"},` +
    `${y.statVar[yStatVar].denominators[0] || "yPopulation-Count_Person"}\n`;
  // Data
  for (const [xVal, yVal, xPop, yPop] of _.zip(
    x.data,
    y.data,
    x.populations,
    y.populations
  )) {
    csv +=
      `${xVal === undefined ? "" : xVal},` +
      `${yVal === undefined ? "" : yVal},` +
      `${xPop === undefined ? "" : xPop},` +
      `${yPop === undefined ? "" : yPop}\n`;
  }

  saveToFile(
    `${x.name}-` +
      `${y.name}-` +
      `${place.enclosingPlace.name}-` +
      `${place.enclosedPlaceType}.csv`,
    csv
  );
}

function updateStats(points: Array<Point>): void {
  d3.select("#x-mean").html(getXMean(points));
  d3.select("#y-mean").html(getYMean(points));
  d3.select("#x-std").html(getXStd(points));
  d3.select("#y-std").html(getYStd(points));
}

function isBetween(num: number, lower: number, upper: number): boolean {
  if (_.isNil(lower) || _.isNil(upper)) {
    return true;
  }
  return lower <= num && num <= upper;
}

function getStringOrNA(num: number): string {
  return _.isNil(num)
    ? "N/A"
    : Number.isInteger(num)
    ? num.toString()
    : num.toFixed(3);
}

function getXMean(points: Array<Point>): string {
  return getStringOrNA(d3.mean(points.map((point) => point.xVal)));
}

function getYMean(points: Array<Point>): string {
  return getStringOrNA(d3.mean(points.map((point) => point.yVal)));
}

function getXStd(points: Array<Point>): string {
  return getStringOrNA(d3.deviation(points.map((point) => point.xVal)));
}

function getYStd(points: Array<Point>): string {
  return getStringOrNA(d3.deviation(points.map((point) => point.yVal)));
}

function plot(points: Array<Point>, x: Axis, y: Axis): void {
  d3.select("#scatterplot").remove();
  d3.select("#tooltip").remove();

  // TODO: Handle log domain 0.
  const xMinMax = d3.extent(points, (point) => point.xVal);
  const yMinMax = d3.extent(points, (point) => point.yVal);

  const xLabel = _.startCase(x.name) + (x.perCapita ? " Per Capita" : "");
  const yLabel = _.startCase(y.name) + (y.perCapita ? " Per Capita" : "");

  const margin = {
    top: 50,
    right: 10,
    bottom: 60,
    left: 50,
  };
  const svgWidth = 1200;
  const svgHeight = 550;
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const svg = d3
    .select("#chart-svg")
    .append("svg")
    .attr("id", "scatterplot")
    .attr("width", "100%")
    .attr("height", svgHeight)
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = (x.log ? d3.scaleLog() : d3.scaleLinear())
    .domain(xMinMax)
    .range([0, width])
    .nice();
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(x.log ? 5 : 10, d3.format(x.perCapita ? ".3f" : "d"))
    );
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `translate(${width / 2},${height + margin.bottom / 2 + 10})`
    )
    .text(xLabel);

  const yScale = (y.log ? d3.scaleLog() : d3.scaleLinear())
    .domain(yMinMax)
    .range([height, 0])
    .nice();
  svg
    .append("g")
    .call(
      d3
        .axisLeft(yScale)
        .ticks(y.log ? 5 : 10, d3.format(y.perCapita ? ".3f" : "d"))
    );
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `rotate(-90) translate(${-height / 2},${-(margin.left + 5)})`
    )
    .text(yLabel);

  svg
    .append("text")
    .attr("transform", `translate(${width / 2},${-margin.top / 2})`)
    .attr("text-anchor", "middle")
    .style("font-size", "1.2em")
    .text(`${yLabel} vs ${xLabel}`);

  const tooltip = d3
    .select("#chart-svg")
    .append("div")
    .attr("id", "tooltip")
    .style("visibility", "hidden")
    .style("position", "fixed");

  const onTooltipMouseover = (point: Point) => {
    const html =
      `${point.place.name || point.place.dcid}<br/>` +
      `${xLabel}: ${getStringOrNA(point.xVal)}<br/>` +
      `${yLabel}: ${getStringOrNA(point.yVal)}`;
    tooltip
      .html(html)
      .style("left", d3.event.pageX + 15 + "px")
      .style("top", d3.event.pageY - 28 + "px")
      .style("visibility", "visible");
  };
  const onTooltipMouseout = () => {
    tooltip.style("visibility", "hidden");
  };

  svg
    .selectAll("dot")
    .data(points)
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("cx", (point) => xScale(point.xVal))
    .attr("cy", (point) => yScale(point.yVal))
    .attr("stroke", "rgb(147, 0, 0)")
    .attr("stroke-width", 1.5)
    .attr("fill", "#FFFFFF")
    .style("opacity", "0.7")
    .on("mouseover", onTooltipMouseover)
    .on("mouseout", onTooltipMouseout);
}

function loadPopulationsAndDataIfNeeded(
  axis: ContextFieldType<Axis>,
  place: Place
): void {
  if (!_.isEmpty(axis.value.statVar)) {
    if (_.isEmpty(axis.value.populations)) {
      loadPopulations(axis, place);
    }
    if (_.isEmpty(axis.value.data)) {
      loadData(axis, place);
    }
  }
}

function loadPopulations(axis: ContextFieldType<Axis>, place: Place): void {
  Promise.all(
    place.enclosedPlaces.map((namedPlace) =>
      getTimeSeriesLatestPoint(
        namedPlace.dcid,
        Object.values(axis.value.statVar)[0].denominators[0] || "Count_Person"
      ).catch(() => undefined)
    )
  ).then((populations) => setPopulations(axis, populations));
}

function loadData(axis: ContextFieldType<Axis>, place: Place): void {
  Promise.all(
    place.enclosedPlaces.map((namedPlace) =>
      getTimeSeriesLatestPoint(
        namedPlace.dcid,
        _.findKey(axis.value.statVar)
      ).catch(() => undefined)
    )
  ).then((data) => setData(axis, data));
}

export { Chart };
