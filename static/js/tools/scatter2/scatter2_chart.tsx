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

import React, { Component, useContext, useEffect } from "react";
import _ from "lodash";
import * as d3 from "d3";
import { ScatterContext } from "./scatter2_app";
import { getPopulations, getTimeSeriesLatestPoint } from "./scatter2_util";

function ScatterChart(): JSX.Element {
  const context = useContext(ScatterContext);

  function plot(): void {
    console.log("Plotting");
    const margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40,
    };
    const width = 700 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    d3.select("#scatterplot").remove();
    const svg = d3
      .select("#chart-svg")
      .append("svg")
      .attr("id", "scatterplot")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const x = d3
      .scaleLinear()
      .domain(d3.extent(context.x.value.data, (val) => val))
      .range([0, width]);
    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    const y = d3
      .scaleLinear()
      .domain(d3.extent(context.y.value.data, (val) => val))
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    const path = svg
      .selectAll("dot")
      .data(_.zip(context.x.value.data, context.y.value.data))
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("cx", function (d) {
        return x(d[0]);
      })
      .attr("cy", function (d) {
        return y(d[1]);
      })
      .attr("stroke", "#32CD32")
      .attr("stroke-width", 1.5)
      .attr("fill", "#FFFFFF");
  }

  useEffect(() => {
    const x = context.x;
    const y = context.y;
    const place = context.place;
    const placeSelected =
      place.value.country &&
      place.value.enclosedPlaceType &&
      place.value.enclosingPlace.dcid &&
      !_.isEmpty(place.value.enclosedPlaces);
    console.log(123);
    if (!placeSelected) {
      return;
    }
    console.log(x.value.statVar);
    if (!_.isEmpty(x.value.statVar) && _.isEmpty(x.value.data)) {
      Promise.all(
        place.value.enclosedPlaces.map((dcid) =>
          getTimeSeriesLatestPoint(dcid, _.findKey(x.value.statVar))
        )
      ).then((values) => context.x.set({ ...context.x.value, data: values }));
    }
    if (!_.isEmpty(y.value.statVar) && _.isEmpty(y.value.data)) {
      Promise.all(
        place.value.enclosedPlaces.map((dcid) =>
          getTimeSeriesLatestPoint(dcid, _.findKey(y.value.statVar))
        )
      ).then((values) => context.y.set({ ...context.y.value, data: values }));
    }
    if (!_.isEmpty(x.value.data) && !_.isEmpty(y.value.data)) {
      plot();
    }
  }, [context]);

  return <div id="chart-svg"></div>;
}

export { ScatterChart };
