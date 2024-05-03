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
 * Util functions used by node js server
 */

import _ from "lodash";
import * as xmlserializer from "xmlserializer";
import * as zlib from "zlib";

import { SVGNS, XLINKNS } from "../../js/constants/svg_constants";
import { StatVarSpec } from "../../js/shared/types";
import { urlToDisplayText } from "../../js/shared/util";
import {
  EventTypeSpec,
  TileConfig,
} from "../../js/types/subject_page_proto_types";
import {
  CHART_PARAMS,
  COMPRESSED_VAL_ENCODING,
  FONT_FAMILY,
  FONT_SIZE,
  SVG_HEIGHT,
  SVG_PADDING,
  SVG_WIDTH,
} from "../constants";
import { ChartProps } from "../types";

/**
 * Gets a list of source objects with name and url from a set of source urls.
 * @param sources set of source urls
 */
export function getSources(
  sources: Set<string>
): { name: string; url: string }[] {
  return Array.from(sources).map((src) => {
    return {
      name: urlToDisplayText(src),
      url: src,
    };
  });
}

/**
 * Processes and serializes a svg for a chart and returns the image element for
 * that chart.
 * @param chartSvg the svg element for the chart to process
 */
export function getProcessedSvg(
  chartSvg: SVGSVGElement,
  isDisasterMapTile?: boolean
): SVGSVGElement {
  if (!chartSvg) {
    return null;
  }
  const height = Number(chartSvg.getAttribute("height")) || SVG_HEIGHT;
  chartSvg.setAttribute("xmlns", SVGNS);
  chartSvg.setAttribute("xmlns:xlink", XLINKNS);

  // TODO (juliawu): Setting padding, height/width, and transform is a hacky
  //                 workaround for getting axes labels to show up in pngs.
  //                 Need to switch to dynamically setting svg size.
  const svgWidth = SVG_WIDTH + 2 * SVG_PADDING;
  const svgHeight = height + 2 * SVG_PADDING;
  chartSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  chartSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Add a white background by adding a white rect element
  const backgroundElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );
  backgroundElement.setAttribute("width", `${svgWidth + SVG_PADDING}`);
  backgroundElement.setAttribute("height", `${svgHeight + SVG_PADDING}`);
  backgroundElement.setAttribute(
    "transform",
    `translate(-${SVG_PADDING}, -${SVG_PADDING})`
  );
  backgroundElement.setAttribute("fill", "white");
  chartSvg.insertBefore(backgroundElement, chartSvg.firstChild);

  if (!isDisasterMapTile) {
    // Disaster event map tiles are already centered in the SVG.
    // Translate to center all other tile types.
    chartSvg.setAttribute(
      "transform",
      `translate(${SVG_PADDING}, ${SVG_PADDING})`
    );
  }

  // Set the font for all the text in the svg to match the font family and size
  // used for getBBox calculations.
  chartSvg.querySelectorAll("text").forEach((node) => {
    node.setAttribute("font-family", FONT_FAMILY);
    node.setAttribute("font-size", FONT_SIZE);
  });
  return chartSvg;
}

/**
 * Get the serialized xml string for an svg element
 * @param chartSvg the svg element to get the xml for
 */
export function getSvgXml(chartSvg: SVGSVGElement): string {
  if (!chartSvg) {
    return "";
  }
  const svgXml = xmlserializer.serializeToString(chartSvg);
  return "data:image/svg+xml," + encodeURIComponent(svgXml);
}

/**
 * Gets the url that will return a chart for a specific set of properties.
 * @param tileConfig tile config of the chart
 * @param placeDcid place to use for the chart
 * @param statVarSpec list of stat var specs to use for the chart
 * @param enclosedPlaceType enclosed place type to use for the chart
 * @param eventTypeSpec map of event type to its event type spec to use for the
 *                      chart
 * @param urlRoot url root to use for the returned url
 */
export function getChartUrl(
  tileConfig: TileConfig,
  placeDcid: string,
  statVarSpec: StatVarSpec[],
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  urlRoot: string,
  apikey?: string
): string {
  const tileConfigParamVal = _.cloneDeep(tileConfig);
  // tile config that gets passed in the url doesn't need statVarKey because
  // it's used to generate the statVarSpec which itself gets passed in the url.
  delete tileConfigParamVal.statVarKey;
  const chartProps: ChartProps = {
    enclosedPlaceType,
    eventTypeSpec,
    place: placeDcid,
    statVarSpec,
    tileConfig: tileConfigParamVal,
  };
  const paramMapping = {
    [CHART_PARAMS.API_KEY]: apikey,
    [CHART_PARAMS.PROPS]: compressChartProps(chartProps),
  };
  let url = `${urlRoot}/nodejs/chart?`;
  Object.keys(paramMapping)
    .sort()
    .forEach((paramKey, idx) => {
      const paramVal = paramMapping[paramKey];
      if (!paramVal) {
        return;
      }
      url += `${idx === 0 ? "" : "&"}${paramKey}=${paramVal}`;
    });
  return encodeURI(url);
}

export function compressChartProps(chartProps: ChartProps): string {
  const chartPropsStr = JSON.stringify(chartProps);
  let compressedStr = zlib.deflateSync(chartPropsStr).toString("base64");
  // base64 encoding includes the characters +/= which need to be manually
  // escaped.
  for (const c in COMPRESSED_VAL_ENCODING) {
    compressedStr = compressedStr.replaceAll(c, COMPRESSED_VAL_ENCODING[c]);
  }
  return compressedStr;
}

export function decompressChartProps(propString: string): ChartProps {
  let decompressedStr = propString;
  for (const c in COMPRESSED_VAL_ENCODING) {
    decompressedStr = decompressedStr.replaceAll(COMPRESSED_VAL_ENCODING[c], c);
  }
  // Convert all the manually escaped characters back to their original
  // characters.
  decompressedStr = zlib
    .inflateSync(Buffer.from(decompressedStr, "base64"))
    .toString();
  return JSON.parse(decompressedStr);
}
