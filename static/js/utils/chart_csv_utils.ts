/**
 * Copyright 2023 Google LLC
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

/**
 * Util functions for getting csv for charts.
 */

import { DataGroup, DataPoint } from "../chart/base";
import { Point } from "../chart/draw_scatter";
import { GeoJsonData } from "../chart/types";
import { RankingPoint } from "../types/ranking_unit_types";

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
 * Gets the csv (as a string) for a  list of data groups.
 * @param dataGroups data groups to get the csv for
 */
export function dataGroupsToCsv(dataGroups: DataGroup[]): string {
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

/**
 * Gets the csv (as a string) for scatter plot data.
 * @param xStatVar dcid of the stat var for the x axis
 * @param xDenom dcid of the denominator for the x axis
 * @param yStatVar dcid of the stat var for the y axis
 * @param yDenom dcid fo the denominator for the y axis
 * @param scatterPoints list of scatter plot points
 */
export function scatterDataToCsv(
  xStatVar: string,
  xDenom: string,
  yStatVar: string,
  yDenom: string,
  scatterPoints: { [placeDcid: string]: Point }
): string {
  const rows = [];
  // Headers
  let header =
    "placeName," +
    "placeDcid," +
    "xDate," +
    `xValue-${xStatVar},` +
    "yDate," +
    `yValue-${yStatVar}`;
  if (xDenom) {
    header += `,xPopulation-${xDenom}`;
  }
  if (yDenom) {
    header += `,yPopulation-${yDenom}`;
  }
  rows.push(header);
  // Data
  for (const place of Object.keys(scatterPoints)) {
    const point = scatterPoints[place];
    let dataRow = `${point.place.name},${point.place.dcid},${point.xDate},${point.xVal},${point.yDate},${point.yVal}`;
    if (xDenom) {
      dataRow += `,${point.xPopVal || "N/A"}`;
    }
    if (yDenom) {
      dataRow += `,${point.yPopVal || "N/A"}`;
    }
    rows.push(dataRow);
  }
  return rows.join("\n");
}

/**
 * Gets the csv (as a string) for a list of data points.
 * @param dataPoints data points to get the csv for
 */
export function dataPointsToCsv(dataPoints: DataPoint[]): string {
  const rows = ["label,data"];
  for (const datapoint of dataPoints) {
    rows.push(`${datapoint.label},${datapoint.value}`);
  }
  return rows.join("\n");
}

/**
 * Gets the csv (as a string) for a map chart data
 * @param geoJson GeoJson used for the map
 * @param dataValues data values used in the map
 */
export function mapDataToCsv(
  geoJson: GeoJsonData,
  dataValues: { [placeDcid: string]: number }
): string {
  const rows = ["label,data"];
  for (const geo of geoJson.features) {
    if (!geo.id) {
      continue;
    }
    const value = geo.id in dataValues ? dataValues[geo.id] : "N/A";
    const name = geo.properties.name || geo.id;
    rows.push(`${name},${value}`);
  }
  return rows.join("\n");
}

/**
 * Gets the csv (as a string) for a list of ranking points
 * @param rankingPoints ranking points to get the csv for
 */
export function rankingPointsToCsv(rankingPoints: RankingPoint[]): string {
  const rows = ["rank,place,data"];
  rankingPoints.forEach((point, idx) => {
    const placeName = point.placeName || point.placeDcid;
    const rank = point.rank || idx + 1;
    rows.push(`${rank},${placeName},${point.value}`);
  });
  return rows.join("\n");
}
