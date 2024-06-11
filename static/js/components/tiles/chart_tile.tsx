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
import React, { MutableRefObject, useRef } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { INITIAL_LOADING_CLASS } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { StatVarSpec } from "../../shared/types";
import {
  formatString,
  getChartTitle,
  getMergedSvg,
  ReplacementStrings,
  TileSources,
} from "../../utils/tile_utils";
import { NlChartFeedback } from "../nl_feedback";
import { ChartFooter } from "./chart_footer";
import { LoadingHeader } from "./loading_header";
interface ChartTileContainerProp {
  id: string;
  isLoading?: boolean;
  title: string;
  sources: Set<string> | string[];
  children: React.ReactNode;
  replacementStrings: ReplacementStrings;
  // Whether or not to allow chart embedding action.
  allowEmbed: boolean;
  // callback function for getting the chart data as a csv. Only used for
  // embedding.
  getDataCsv?: () => Promise<string>;
  // Extra classes to add to the container.
  className?: string;
  // Whether or not this is the initial loading state.
  isInitialLoading?: boolean;
  // Object used for the explore link
  exploreLink?: { displayText: string; url: string };
  // Whether or not there is an error message in the chart.
  hasErrorMsg?: boolean;
  // Text to show in footer
  footnote?: string;
  // Subtitle text
  subtitle?: string;
  // Stat Vars for metadata rendering.
  statVarSpecs?: StatVarSpec[];
  // API root used for DC tool links.
  apiRoot?: string;
  // Optional ref for tile container element
  forwardRef?: MutableRefObject<HTMLDivElement | null>;
}

export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  // on initial loading, hide the title text
  const title = !props.isInitialLoading
    ? getChartTitle(props.title, props.replacementStrings)
    : "";
  const showSources = !_.isEmpty(props.sources) && !props.hasErrorMsg;
  const showEmbed =
    props.allowEmbed && !props.isInitialLoading && !props.hasErrorMsg;
  return (
    <div
      className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS} ${
        props.className ? props.className : ""
      } ${props.isLoading ? "loading" : ""}`}
      {...{ part: "container" }}
      ref={containerRef}
    >
      <div
        className={`chart-content ${
          props.isInitialLoading ? INITIAL_LOADING_CLASS : ""
        }`}
        ref={props.forwardRef}
      >
        <div className="chart-headers">
          <LoadingHeader isLoading={props.isLoading} title={title} />
          <slot name="subheader" {...{ part: "subheader" }}>
            {props.subtitle && !props.isInitialLoading ? (
              <div className="subheader">{props.subtitle}</div>
            ) : null}
          </slot>
          {showSources && (
            <TileSources
              apiRoot={props.apiRoot}
              containerRef={containerRef}
              sources={props.sources}
              statVarSpecs={props.statVarSpecs}
            />
          )}
        </div>
        {props.children}
      </div>
      <ChartFooter
        handleEmbed={showEmbed ? handleEmbed : null}
        exploreLink={props.exploreLink}
        footnote={props.footnote}
      >
        <NlChartFeedback id={props.id} />
      </ChartFooter>
      {showEmbed && (
        <ChartEmbed container={containerRef.current} ref={embedModalElement} />
      )}
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
      props.getDataCsv,
      width,
      height,
      "",
      chartTitle,
      "",
      Array.from(props.sources)
    );
  }
}
