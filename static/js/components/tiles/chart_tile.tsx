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
import React, { useRef, useState } from "react";
import { Spinner } from "reactstrap";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { INITIAL_LOADING_CLASS } from "../../constants/tile_constants";
import {
  formatString,
  getChartTitle,
  getMergedSvg,
  ReplacementStrings,
  TileSources,
} from "../../utils/tile_utils";
import { ChartActions } from "./chart_action_icons";
import { ChartFooter } from "./chart_footer";
import { ChartDownload } from "./modal/chart_download";
interface ChartTileContainerProp {
  id: string;
  isLoading?: boolean;
  title: string;
  sources: Set<string> | string[];
  children: React.ReactNode;
  replacementStrings: ReplacementStrings;
  // Whether or not to allow chart download action.
  allowDownload: boolean;
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
  // Whether to show "Powered by Google's Data Commons" in the footer
  showBrandingInFooter?: boolean;
  // Subtitle text
  subtitle?: string;
  // Whether to display chart actions on the right
  // instead of download and explore links on the left.
  useChartActionIcons?: boolean;
}

export function ChartTileContainer(props: ChartTileContainerProp): JSX.Element {
  const containerRef = useRef(null);
  const downloadModalElement = useRef<ChartDownload>(null);
  // on initial loading, hide the title text
  const title = !props.isInitialLoading
    ? getChartTitle(props.title, props.replacementStrings)
    : "";
  const showSources = !_.isEmpty(props.sources) && !props.hasErrorMsg;
  const showDownload =
    props.allowDownload && !props.isInitialLoading && !props.hasErrorMsg;
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
      >
        <div className="chart-headers">
          {
            /* We want to render this header element even if title is empty
            to keep the space on the page */
            props.title && (
              <h4 {...{ part: "header" }}>
                {props.isLoading ? (
                  <>
                    <Spinner color="secondary" size="sm" className="pr-1" />
                    {title ? "" : " Loading..."}
                  </>
                ) : null}{" "}
                {title}
              </h4>
            )
          }
          <slot name="subheader" {...{ part: "subheader" }}>
            {props.subtitle && !props.isInitialLoading ? (
              <div className="subheader">{props.subtitle}</div>
            ) : null}
          </slot>
          {showSources && <TileSources sources={props.sources} />}
        </div>
        {props.children}
      </div>
      <ChartFooter
        footnote={props.footnote}
        exploreLink={!props.useChartActionIcons && props.exploreLink}
        handleDownload={
          !props.useChartActionIcons && props.allowDownload && handleDownload
        }
        showBranding={props.showBrandingInFooter}
      >
        {props.useChartActionIcons && (
          <ChartActions
            id={props.id}
            exploreLink={props.exploreLink}
            handleDownload={props.allowDownload && handleDownload}
          />
        )}
      </ChartFooter>
      {showDownload && (
        <ChartDownload
          container={containerRef.current}
          ref={downloadModalElement}
        />
      )}
    </div>
  );

  // Handle when chart download is clicked .
  function handleDownload(): void {
    if (!downloadModalElement.current) {
      return null;
    }
    const chartTitle = props.title
      ? formatString(props.title, props.replacementStrings)
      : "";
    const { svgXml, height, width } = getMergedSvg(containerRef.current);
    downloadModalElement.current.show(
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
