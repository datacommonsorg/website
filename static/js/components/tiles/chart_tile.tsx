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

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { INITAL_LOADING_CLASS } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import {
  formatString,
  getChartTitle,
  getMergedSvg,
  getSourcesJsx,
  ReplacementStrings,
} from "../../utils/tile_utils";
import { NlChartFeedback } from "../nl_feedback";
import { ChartFooter } from "./chart_footer";
interface ChartTileContainerProp {
  id: string;
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
  // Object used for the explore link
  exploreLink?: { displayText: string; url: string };
}

export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const containerRef = useRef(null);
  const embedModalElement = useRef<ChartEmbed>(null);

  // on initial loading, hide the title text
  const title = !props.isInitialLoading
    ? getChartTitle(props.title, props.replacementStrings)
    : "";
  const showEmbed = props.allowEmbed && !props.isInitialLoading;
  return (
    <div
      className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS} ${
        props.className ? props.className : ""
      }`}
      {...{ part: "container" }}
      ref={containerRef}
    >
      <div
        className={`chart-content ${
          props.isInitialLoading ? INITAL_LOADING_CLASS : ""
        }`}
      >
        <div className="chart-headers">
          {
            /* We want to render this header element even if title is empty
            to keep the space on the page */
            props.title && <h4 {...{ part: "header" }}>{title}</h4>
          }
          <slot name="subheader" {...{ part: "subheader" }}></slot>
          {!_.isEmpty(props.sources) && getSourcesJsx(props.sources)}
        </div>
        {props.children}
      </div>
      <ChartFooter
        handleEmbed={showEmbed ? handleEmbed : null}
        exploreLink={props.exploreLink}
      >
        <NlChartFeedback id={props.id} />
      </ChartFooter>
      {showEmbed && <ChartEmbed ref={embedModalElement} />}
    </div>
  );

  // Handle when chart embed is clicked .
  function handleEmbed(): void {
    const chartTitle = props.title
      ? formatString(props.title, props.replacementStrings)
      : "";
    const { svgXml, height, width } = getMergedSvg(containerRef.current);
    embedModalElement.current.show(
      svgXml,
      props.getDataCsv ? props.getDataCsv() : "",
      width,
      height,
      "",
      chartTitle,
      "",
      Array.from(props.sources)
    );
  }
}
