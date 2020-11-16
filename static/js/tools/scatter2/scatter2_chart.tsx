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
import { Axis, Place, ScatterContext } from "./scatter2_app";
import { getTimeSeriesLatestPoint } from "./scatter2_util";
import { Spinner } from "./scatter2_spinner";

interface Point {
  xVal: number;
  yVal: number;
  xPop: number;
  yPop: number;
  place: Place;
}

// TODO: Show provenance.
function Chart(): JSX.Element {
  const context = useContext(ScatterContext);
  const [loading, setLoading] = useState(false);

  function updateStats(points: Array<Point>): void {
    d3.select("#x-mean").html(getXMean(points));
    d3.select("#y-mean").html(getYMean(points));
    d3.select("#x-std").html(getXStd(points));
    d3.select("#y-std").html(getYStd(points));
  }

  function plot(points: Array<Point>): void {
    d3.select("#scatterplot").remove();
    d3.select("#tooltip").remove();

    // TODO: Handle log domain 0.
    const xMinMax = d3.extent(points, (point) => point.xVal);
    const yMinMax = d3.extent(points, (point) => point.yVal);

    const xLabel =
      _.startCase(context.x.value.name) +
      (context.x.value.perCapita ? " Per Capita" : "");
    const yLabel =
      _.startCase(context.y.value.name) +
      (context.y.value.perCapita ? " Per Capita" : "");

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

    const x = (context.x.value.log ? d3.scaleLog() : d3.scaleLinear())
      .domain(xMinMax)
      .range([0, width])
      .nice();
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(
            context.x.value.log ? 5 : 10,
            d3.format(context.x.value.perCapita ? ".3f" : "d")
          )
      );
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        `translate(${width / 2},${height + margin.bottom / 2 + 10})`
      )
      .text(xLabel);

    const y = (context.y.value.log ? d3.scaleLog() : d3.scaleLinear())
      .domain(yMinMax)
      .range([height, 0])
      .nice();
    svg
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(
            context.y.value.log ? 5 : 10,
            d3.format(context.y.value.perCapita ? ".3f" : "d")
          )
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
      .attr("cx", (point) => x(point.xVal))
      .attr("cy", (point) => y(point.yVal))
      .attr("stroke", "rgb(147, 0, 0)")
      .attr("stroke-width", 1.5)
      .attr("fill", "#FFFFFF")
      .style("opacity", "0.7")
      .on("mouseover", onTooltipMouseover)
      .on("mouseout", onTooltipMouseout);
  }

  function areDataComplete(x: Axis, y: Axis): boolean {
    return (
      !_.isEmpty(x.data) &&
      !_.isEmpty(y.data) &&
      !_.isEmpty(x.populations) &&
      !_.isEmpty(y.populations)
    );
  }

  function isPopulationBetween(
    population: number,
    lower: number,
    upper: number
  ): boolean {
    if (_.isNil(lower) || _.isNil(upper)) {
      return true;
    }
    return lower <= population && population <= upper;
  }

  useEffect(() => {
    const x = context.x;
    const y = context.y;
    const place = context.place;
    const placeSelected =
      place.value.enclosedPlaceType &&
      place.value.enclosingPlace.dcid &&
      !_.isEmpty(place.value.enclosedPlaces);
    if (!placeSelected) {
      return;
    }
    if (!context.x.value.name || !context.y.value.name) {
      return;
    }
    if (!_.isEmpty(x.value.statVar)) {
      if (_.isEmpty(x.value.populations)) {
        setLoading(true);
        Promise.all(
          place.value.enclosedPlaces.map((place) =>
            getTimeSeriesLatestPoint(
              place.dcid,
              Object.values(x.value.statVar)[0].denominators[0] ||
                "Count_Person"
            ).catch(() => undefined)
          )
        ).then((values) => x.set({ ...x.value, populations: values }));
      }
      if (_.isEmpty(x.value.data)) {
        setLoading(true);
        Promise.all(
          place.value.enclosedPlaces.map((place) =>
            getTimeSeriesLatestPoint(
              place.dcid,
              _.findKey(x.value.statVar)
            ).catch(() => undefined)
          )
        ).then((values) => x.set({ ...x.value, data: values }));
      }
    }
    if (!_.isEmpty(y.value.statVar)) {
      if (_.isEmpty(y.value.populations)) {
        setLoading(true);
        Promise.all(
          place.value.enclosedPlaces.map((place) =>
            getTimeSeriesLatestPoint(
              place.dcid,
              Object.values(y.value.statVar)[0].denominators[0] ||
                "Count_Person"
            ).catch(() => undefined)
          )
        ).then((values) => y.set({ ...y.value, populations: values }));
      }
      if (_.isEmpty(y.value.data)) {
        setLoading(true);
        Promise.all(
          place.value.enclosedPlaces.map((place) =>
            getTimeSeriesLatestPoint(
              place.dcid,
              _.findKey(y.value.statVar)
            ).catch(() => undefined)
          )
        ).then((values) => y.set({ ...y.value, data: values }));
      }
    }
    if (areDataComplete(x.value, y.value)) {
      const lower = context.place.value.lowerBound;
      const upper = context.place.value.upperBound;
      const points: Array<Point> = _.zip(
        x.value.data,
        y.value.data,
        x.value.populations,
        y.value.populations,
        context.place.value.enclosedPlaces
      )
        .filter(
          ([xVal, yVal, xPop, yPop]) =>
            xVal !== undefined &&
            yVal !== undefined &&
            xPop !== undefined &&
            yPop !== undefined &&
            isPopulationBetween(xPop, lower, upper) &&
            isPopulationBetween(yPop, lower, upper)
        )
        .map(([xVal, yVal, xPop, yPop, place]) => ({
          xVal: context.x.value.perCapita ? xVal / xPop : xVal,
          yVal: context.y.value.perCapita ? yVal / yPop : yVal,
          xPop: xPop,
          yPop: yPop,
          place: place,
        }));
      setLoading(false);
      plot(points);
      updateStats(points);

      const downloadButton = document.getElementById("download-link");
      if (downloadButton) {
        downloadButton.style.visibility = "visible";
        downloadButton.onclick = downloadData;
      }
    }
  }, [context]);

  function downloadData() {
    const xAxis = context.x.value;
    const yAxis = context.y.value;
    if (!areDataComplete(xAxis, yAxis)) {
      alert("Sorry, still retrieving data. Please try again later.");
      return;
    }

    const xStatVar = _.findKey(xAxis.statVar);
    const yStatVar = _.findKey(yAxis.statVar);
    // Headers
    let csv =
      `xValue-${xStatVar},` +
      `yValue-${yStatVar},` +
      `${
        xAxis.statVar[xStatVar].denominators[0] || "xPopulation-Count_Person"
      },` +
      `${
        yAxis.statVar[yStatVar].denominators[0] || "yPopulation-Count_Person"
      }\n`;
    // Data
    for (const [xVal, yVal, xPop, yPop] of _.zip(
      xAxis.data,
      yAxis.data,
      xAxis.populations,
      yAxis.populations
    )) {
      csv +=
        `${xVal === undefined ? "" : xVal},` +
        `${yVal === undefined ? "" : yVal},` +
        `${xPop === undefined ? "" : xPop},` +
        `${yPop === undefined ? "" : yPop}\n`;
    }

    saveToFile(
      `${context.x.value.name}-` +
        `${context.y.value.name}-` +
        `${context.place.value.enclosingPlace.name}-` +
        `${context.place.value.enclosedPlaceType}.csv`,
      csv
    );
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

export { Chart };
