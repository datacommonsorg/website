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

import * as d3 from "d3";
import _ from "lodash";

import { translateVariableString } from "../i18n/i18n";
import { StatVarInfo } from "../shared/stat_var";
import {
  isIpccStatVar,
  isTemperaturePredictionModel,
} from "../tools/shared_util";

const DEFAULT_COLOR = "#000";

const MAX_PREDICTION_COLORS = ["#dc3545", "#fac575"];
const MIN_PREDICTION_COLORS = ["#007bff", "#66c2a5"];
export class DataPoint {
  value: number;
  label: string;
  // Optional DCID to add to a chart as a data atttribute
  dcid?: string;
  // Optional Label link to show on UI element
  link?: string;
  // Optional time value. If datapoint label is a date string,
  // this field should be set.
  time?: number;
  constructor(
    label: string,
    value: number,
    dcid?: string,
    link?: string,
    time?: number
  ) {
    this.value = value;
    this.label = label;
    this.dcid = dcid;
    this.link = link;
    this.time = time;
  }
}

export class DataGroup {
  value: DataPoint[];
  // Label of the DataGroup. This could be different from the DataPoint label.
  // For example, the label of a data point could be date string, while the
  // label of the DataGroup is a place name.
  label: string;
  // Optional label link to show on UI element
  link?: string;
  constructor(label: string, value: DataPoint[], link?: string) {
    this.value = value;
    this.label = label;
    this.link = link;
  }
  nonNullValues(): number[] {
    return this.value
      .filter((dataPoint) => dataPoint.value !== null)
      .map((dataPoint) => dataPoint.value);
  }
  sum(): number {
    return this.value
      .map((dataPoint) => dataPoint.value)
      .reduce((a, b) => a + b);
  }
  max(): number {
    return Math.max(...this.nonNullValues());
  }
  min(): number {
    return Math.min(...this.nonNullValues());
  }
}

/**
 * Join words in :line: with appropriate separator (handles "-" or " ")
 */
function joinLineForWrap(line: string[]): string {
  let ret = "";
  for (let i = 0; i < line.length; i++) {
    const word = line[i];
    const separator =
      i === line.length - 1 ? "" : word.slice(-1) === "-" ? "" : " ";
    ret = `${ret}${word}${separator}`;
  }
  return ret;
}

/**
 * From https://bl.ocks.org/mbostock/7555321
 * Wraps axis text by fitting as many words per line as would fit a given width.
 */
export function wrap(
  textSelection: d3.Selection<SVGTextElement, any, any, any>,
  width: number
): void {
  textSelection.each(function () {
    const text = d3.select(this);
    const words = text
      .text()
      .replace(/-/g, "-#") // Handle e.g. "ABC-AB A" -> "ABC-", "AB" "A"
      .split(/[\s#]/)
      .filter((w) => w.trim() != "")
      .reverse();
    text.text(null);

    const lineHeight = 1.1; // ems
    const y = text.attr("y");
    const dy = parseFloat(text.attr("dy") || "0");

    let lineToFit: string[] = [];
    for (
      let lineNumber = 0;
      words.length > 0 || lineToFit.length > 0;
      lineNumber++
    ) {
      const tspan = text
        .append("tspan")
        .attr("x", 0)
        .attr("y", y)
        .attr("dy", lineNumber * lineHeight + dy + "em")
        .text(null);
      do {
        // Find as many words that fit in each line.
        const word: string = words.pop();
        if (word) {
          word.trim();
          lineToFit.push(word);
        }
        const line = joinLineForWrap(lineToFit);
        if (line == tspan.text()) {
          lineToFit = [];
          break;
        }
        tspan.text(line);
      } while (tspan.node().getComputedTextLength() < width);
      // Can't fit - prepare for the next line.
      const word = lineToFit.pop();
      if (lineToFit.length) {
        tspan.text(joinLineForWrap(lineToFit));
        lineToFit = [word];
      }
    }
    const bbox = text.node().getBBox();
    if (bbox.width > width) {
      text.attr("wrap-overflow", "1");
    }
  });
}

/**
 * Return an array of dashes.
 */
export function getDashes(n: number): string[] {
  if (n === 0) {
    return [];
  }
  const dashes = [""];
  if (dashes.length === n) return dashes;
  for (let sum = 10; ; sum += 6) {
    let left = sum / 2;
    let right = sum / 2;
    while (left >= 3) {
      dashes.push("" + left + ", " + right);
      if (dashes.length === n) return dashes;
      left -= 2;
      right += 2;
    }
  }
}

/**
 * Creates a color function mapping labels to specific colors.
 *
 * @param labels labels to map to colors
 * @param colors colors to assign, as a list of hex color codes
 * @returns D3 scale mapping labels to its assigned color.
 */
export function getColorFn(
  labels: string[],
  colors?: string[]
): d3.ScaleOrdinal<string, string> {
  if (colors) {
    return d3.scaleOrdinal<string, string>().domain(labels).range(colors);
  }

  let domain = labels;
  let range;
  if (
    // TODO(beets): This relies on the fact that we will always have
    // stats_var_labels.json for the locale loaded. Ideally, we would look for
    // the gender in the stat var itself.
    labels.length === 2 &&
    labels[0] === translateVariableString("Count_Person_Female")
  ) {
    range = ["#a60000", "#3288bd"];
  } else {
    if (labels.length == 1) {
      // Get varied but stable color scheme for single stat var charts.
      const label = labels[0] || "";
      let charCodeSum = 0;
      for (let i = 0; i < label.length; i++) {
        charCodeSum += label.charCodeAt(i);
      }
      domain = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      domain[charCodeSum % domain.length] = label;
    }
    range = d3.quantize(
      d3.interpolateRgbBasis([
        "#930000",
        "#d30000",
        "#f46d43",
        "#fdae61",
        "#fee08b",
        "#66c2a5",
        "#3288bd",
        "#5e4fa2",
      ]),
      domain.length
    );
  }
  return d3.scaleOrdinal<string, string>().domain(domain).range(range);
}

export interface Style {
  color: string;
  dash?: string;
  legendLink?: string;
}

export interface PlotParams {
  lines: { [key: string]: Style };
  legend: { [key: string]: Style };
}

/**
 * Fixed to reddish hues for historical / projected max temperatures, and
 * blueish hues for historical / projected min temperatures. Darker colors are
 * for historical.
 *
 * Returns undefined if the stat var is not IPCC Temperature related.
 */
function getTempColorFn(statVars: string[]): (sv: string) => string {
  const tempColorMap = {};
  const seenColors = new Set();
  const reversedSvList = _.clone(statVars).reverse();
  for (const sv of reversedSvList) {
    if (!isIpccStatVar(sv)) {
      continue;
    }
    if (isTemperaturePredictionModel(sv)) {
      if (sv.indexOf("Max") >= 0) {
        tempColorMap[sv] =
          MAX_PREDICTION_COLORS.find((color) => !seenColors.has(color)) ||
          MAX_PREDICTION_COLORS[0];
        seenColors.add(tempColorMap[sv]);
      } else {
        tempColorMap[sv] =
          MIN_PREDICTION_COLORS.find((color) => !seenColors.has(color)) ||
          MIN_PREDICTION_COLORS[0];
        seenColors.add(tempColorMap[sv]);
      }
      continue;
    }
    if (sv.indexOf("Max") >= 0) {
      tempColorMap[sv] = "#600";
    } else {
      tempColorMap[sv] = "#003874";
    }
  }
  return (label: string) => tempColorMap[label];
}

/**
 * Return color and dash style given place names and stats var display names.
 *
 * Detailed spec of the chart style: https://docs.google.com/document/d/1Sw6Nq0E2XY0318Kd9fiZLUgSG7rgKJbr4LAjRqND90w
 * Note the plot params is based on place names and stats var display text, not
 * the dcids. The client needs a mapping from stats var dcid to the display text,
 * which can be used together with this function in drawGroupLineChart().
 */
export function computePlotParams(
  placeNames: Record<string, string>,
  statVars: string[],
  statVarInfo: Record<string, StatVarInfo>
): PlotParams {
  const lines: { [key: string]: Style } = {};
  const legend: { [key: string]: Style } = {};
  const placeDcids = Object.keys(placeNames);
  if (placeDcids.length === 1) {
    const placeName = placeNames[placeDcids[0]];
    const colorFn = getColorFn(statVars);
    const tempColorFn = getTempColorFn(statVars);
    for (const statVar of statVars) {
      const color = tempColorFn(statVar) || colorFn(statVar);
      lines[placeName + statVar] = { color, dash: "" };
      let legendLabel = `${statVar} (${placeName})`;
      if (statVar in statVarInfo) {
        legendLabel = `${statVarInfo[statVar].title || statVar} (${placeName})`;
      }
      const legendLink = `/browser/${placeDcids[0]}?statVar=${statVar}`;
      legend[legendLabel] = { color, legendLink };
    }
  } else if (statVars.length === 1) {
    const colorFn = getColorFn(Object.values(placeNames));
    for (const placeDcid of placeDcids) {
      const placeName = placeNames[placeDcid];
      lines[placeName + statVars[0]] = { color: colorFn(placeName), dash: "" };
      let legendLabel = `${statVars[0]} (${placeName})`;
      if (statVars[0] in statVarInfo) {
        legendLabel = `${
          statVarInfo[statVars[0]].title || statVars[0]
        } (${placeName})`;
      }
      const legendLink = `/browser/${placeDcid}?statVar=${statVars[0]}`;
      legend[legendLabel] = { color: colorFn(placeName), legendLink };
    }
  } else {
    const colorFn = getColorFn(statVars);
    const tempColorFn = getTempColorFn(statVars);
    const dashFn = getDashes(placeDcids.length);
    for (let i = 0; i < placeDcids.length; i++) {
      const placeName = placeNames[placeDcids[i]];
      const legendLink = `/browser/${placeDcids[i]}?openSv=${statVars.join(
        "__"
      )}`;
      legend[placeName] = { color: DEFAULT_COLOR, dash: dashFn[i], legendLink };
      for (const statVar of statVars) {
        const color = tempColorFn(statVar) || colorFn(statVar);
        lines[placeName + statVar] = {
          color,
          dash: dashFn[i],
        };
      }
    }
  }
  return { lines, legend };
}

export function shouldFillInValues(series: number[][]): boolean {
  const defined = (d) => {
    return d[1] !== null;
  };
  const n = series.length;

  // "Trim" the ends
  let i = 0;
  while (i < n) {
    if (!defined(series[i])) i++;
    else break;
  }
  const firstNonNullIndex = i;

  i = n - 1;
  while (i >= 0) {
    if (!defined(series[i])) i--;
    else break;
  }
  const lastNonNullIndex = i;

  // Find if there are gaps in the middle
  for (let i = firstNonNullIndex; i <= lastNonNullIndex; i++) {
    if (!defined(series[i])) {
      return true;
    }
  }
  return false;
}

// Expand an array of DataPoints based on given dates.
// If a date is not present in the array, add a null data point for it.
export function expandDataPoints(
  dataPoints: DataPoint[],
  dates: Set<string>
): DataPoint[] {
  const result: DataPoint[] = _.cloneDeep(dataPoints);
  dates.forEach((date) => {
    if (!dates.has(date)) {
      result.push({ label: date, time: new Date(date).getTime(), value: null });
    }
  });
  result.sort(function (a, b) {
    return a.label > b.label ? -1 : 1;
  });
  return result;
}
