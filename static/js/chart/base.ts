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
import { translateVariableString } from "../i18n/i18n";

const DEFAULT_COLOR = "#000";

class DataPoint {
  value: number;
  label: string;
  // Optional DCID to add to a chart as a data atttribute
  dcid?: string;
  // Optional Label link to show on UI element
  link?: string;
  constructor(label: string, value: number, dcid?: string, link?: string) {
    this.value = value;
    this.label = label;
    this.dcid = dcid;
    this.link = link;
  }
}

class DataGroup {
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
  sum(): number {
    return this.value
      .map((dataPoint) => dataPoint.value)
      .reduce((a, b) => a + b);
  }
  max(): number {
    return Math.max(...this.value.map((dataPoint) => dataPoint.value));
  }
  min(): number {
    return Math.min(...this.value.map((dataPoint) => dataPoint.value));
  }
}

/**
 * Return an array of dashes.
 */
function getDashes(n: number): string[] {
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

function getColorFn(labels: string[]): d3.ScaleOrdinal<string, string> {
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

interface Style {
  color: string;
  dash?: string;
}

interface PlotParams {
  lines: { [key: string]: Style };
  legend: { [key: string]: Style };
}

/**
 * Return color and dash style given place names and stats var display names.
 *
 * Detailed spec of the chart style: https://docs.google.com/document/d/1Sw6Nq0E2XY0318Kd9fiZLUgSG7rgKJbr4LAjRqND90w
 * Note the plot params is based on place names and stats var display text, not
 * the dcids. The client needs a mapping from stats var dcid to the display text,
 * which can be used together with this function in drawGroupLineChart().
 */
function computePlotParams(
  placeNames: string[],
  statsVars: string[]
): PlotParams {
  const lines: { [key: string]: Style } = {};
  const legend: { [key: string]: Style } = {};
  if (placeNames.length === 1) {
    const colorFn = getColorFn(statsVars);
    for (const statsVar of statsVars) {
      lines[placeNames[0] + statsVar] = { color: colorFn(statsVar), dash: "" };
      legend[statsVar] = { color: colorFn(statsVar) };
    }
  } else if (statsVars.length === 1) {
    const colorFn = getColorFn(placeNames);
    for (const placeName of placeNames) {
      lines[placeName + statsVars[0]] = { color: colorFn(placeName), dash: "" };
      legend[placeName] = { color: colorFn(placeName) };
    }
  } else {
    const colorFn = getColorFn(statsVars);
    const dashFn = getDashes(placeNames.length);
    for (let i = 0; i < placeNames.length; i++) {
      legend[placeNames[i]] = { color: DEFAULT_COLOR, dash: dashFn[i] };
      for (const statsVar of statsVars) {
        lines[placeNames[i] + statsVar] = {
          color: colorFn(statsVar),
          dash: dashFn[i],
        };
      }
    }
  }
  return { lines, legend };
}

function shouldFillInValues(series: number[][]): boolean {
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

// TODO(beets): Create DataPoints class and add this to that class.
/**
 * Returns the value associated with the given label in dataPoints, or null.
 */
function findDataPointOrNull(
  dataPoints: DataPoint[],
  label: string
): number | null {
  for (const dp of dataPoints) {
    if (dp.label == label) {
      return dp.value;
    }
  }
  return null;
}

// TODO(beets): Also add a dataPointsToCsv function.
// TODO(beets): Create DataGroups class and add this to that class.
/**
 * Returns dataGroups as a CSV.
 */
function dataGroupsToCsv(dataGroups: DataGroup[]): string {
  if (!dataGroups || dataGroups.length == 0) {
    return "";
  }
  // Get all the dates
  let allLabels = new Set<string>();
  for (const dg of dataGroups) {
    const dates = dg.value.map((dp) => dp.label);
    allLabels = new Set([...Array.from(allLabels), ...dates]);
  }
  // Create the the header row.
  const header = ["label"];
  for (const dg of dataGroups) {
    header.push(`"${dg.label}"`);
  }

  // Iterate each year, group, place, stats var to populate data
  const rows: string[][] = [];
  for (const label of Array.from(allLabels)) {
    const row: string[] = [label];
    for (const dg of dataGroups) {
      const v = findDataPointOrNull(dg.value, label);
      if (v) {
        row.push(String(v));
      } else {
        row.push("");
      }
    }
    rows.push(row);
  }
  const headerRow = header.join(",") + "\n";
  let result = headerRow;
  for (const row of rows) {
    result += row.join(",") + "\n";
  }
  return result;
}

interface Range {
  // min value of the range.
  minV: number;
  // max value of the range.
  maxV: number;
}

export {
  DataGroup,
  DataPoint,
  Range,
  PlotParams,
  Style,
  computePlotParams,
  dataGroupsToCsv,
  getColorFn,
  getDashes,
  shouldFillInValues,
};
