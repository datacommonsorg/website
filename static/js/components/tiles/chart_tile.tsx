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

import { INITAL_LOADING_CLASS } from "../../constants/tile_constants";
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
  // Whether or not this is the initial loading state.
  isInitialLoading?: boolean;
}

export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const containerRef = useRef(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  // on initial loading, hide the title text
  const title =
    props.title && !props.isInitialLoading
      ? formatString(props.title, props.replacementStrings)
      : "";
  const showEmbed = props.allowEmbed && !props.isInitialLoading;
  return (
    <div
      className={`chart-container ${props.className ? props.className : ""}`}
      ref={containerRef}
    >
      <div
        className={`chart-content ${
          props.isInitialLoading ? INITAL_LOADING_CLASS : ""
        }`}
      >
        {
          /* If props.title is not empty, we want to render this header element
              even if title is empty to keep the space on the page */
          props.title && <h4>{title}</h4>
        }
        {props.children}
      </div>
      <ChartFooter
        sources={props.sources}
        handleEmbed={showEmbed ? handleEmbed : null}
      />
      {showEmbed && <ChartEmbed ref={embedModalElement} />}
    </div>
  );

  // Handle when chart embed is clicked .
  function handleEmbed(): void {
    const chartTitle = props.title
      ? formatString(props.title, props.replacementStrings)
      : "";
    const svgElemList = containerRef.current.getElementsByTagName(
      "svg"
    ) as SVGElement[];
    // Create new svg element to return which will hold all the svgs coming from
    // containerRef
    const embedSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    let embedSvgWidth = 0;
    let embedSvgHeight = 0;
    // Set embedSvgHeight as the max height of all svgs
    Array.from(svgElemList).forEach((svg) => {
      embedSvgHeight = Math.max(svg.getBBox().height, embedSvgHeight);
    });
    // Add each svg from svgElemList to embedSvg
    for (const svg of svgElemList) {
      const svgBBox = svg.getBBox();
      const clonedSvg = svg.cloneNode(true) as SVGElement;
      // Set height of current svg to the height of the embedSvg
      clonedSvg.setAttribute("height", `${embedSvgHeight}`);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      // Move current svg to the right of svgs that have already been added to
      // embedSvg
      g.setAttribute("transform", `translate(${embedSvgWidth})`);
      g.appendChild(clonedSvg);
      embedSvg.appendChild(g);
      // Update width of embedSvg to include current svg width
      embedSvgWidth += svgBBox.width + svgBBox.x;
    }
    const svgXml =
      !_.isEmpty(svgElemList) && embedSvg ? embedSvg.outerHTML : "";
    embedModalElement.current.show(
      svgXml,
      props.getDataCsv ? props.getDataCsv() : "",
      embedSvgWidth,
      embedSvgHeight,
      "",
      chartTitle,
      "",
      Array.from(props.sources)
    );
  }
}
