/**
 * Copyright 2022 Google LLC
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
 * A container for any tile containing a chart.
 */

import _ from "lodash";
import React, { useRef } from "react";

import { ChartEmbed } from "../../place/chart_embed";
import { formatString, ReplacementStrings } from "../../utils/tile_utils";
import { ChartFooter } from "./chart_footer";

interface ChartTileContainerProp {
  title: string;
  sources: Set<string>;
  children: React.ReactNode;
  replacementStrings: ReplacementStrings;
  // Whether or not to allow chart embedding action.
  allowEmbed: boolean;
  // callback function for getting the chart data as a csv. Only used for
  // embedding.
  getDataCsv?: () => string;
  // Extra classes to add to the container.
  className?: string;
}

export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const containerRef = useRef(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const title = props.title
    ? formatString(props.title, props.replacementStrings)
    : "";
  return (
    <div
      className={`chart-container ${props.className ? props.className : ""}`}
      ref={containerRef}
    >
      {title && <h4>{title}</h4>}
      {props.children}
      <ChartFooter
        sources={props.sources}
        handleEmbed={props.allowEmbed ? handleEmbed : null}
      />
      {props.allowEmbed && <ChartEmbed ref={embedModalElement} />}
    </div>
  );

  // Handle when chart embed is clicked .
  function handleEmbed(): void {
    const chartTitle = props.title
      ? formatString(props.title, props.replacementStrings)
      : "";
    const svgElemList = containerRef.current.getElementsByTagName("svg");
    const svgElem = svgElemList.length ? svgElemList.item(0) : null;
    let svgXml = "";
    let svgWidth = 0;
    let svgHeight = 0;
    if (svgElem) {
      svgXml = svgElem.outerHTML;
      const svgBBox = svgElem.getBBox();
      svgWidth = svgBBox.width;
      svgHeight = svgBBox.height;
    }
    embedModalElement.current.show(
      svgXml,
      props.getDataCsv ? props.getDataCsv() : "",
      svgWidth || containerRef.current.offsetWidth,
      svgHeight,
      chartTitle,
      "",
      Array.from(props.sources)
    );
  }
}
