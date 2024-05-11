/**
 * Copyright 2024 Google LLC
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
import React, { useEffect, useRef, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { wrap } from "../../../chart/base";
import {
  ASYNC_ELEMENT_CLASS,
  ASYNC_ELEMENT_HOLDER_CLASS,
} from "../../../constants/css_constants";
import { intl } from "../../../i18n/i18n";
import {
  GA_EVENT_TILE_DOWNLOAD_CSV,
  GA_EVENT_TILE_DOWNLOAD_IMG,
  triggerGAEvent,
} from "../../../shared/ga_events";
import { randDomId, urlToDisplayText } from "../../../shared/util";
import {
  CopyButton,
  DownloadButton,
  IconButton,
} from "../../form_components/icon_buttons";

// SVG adjustment related constants
const TITLE_Y = 20;
const TITLE_MARGIN = 10;
const SOURCES_MARGIN = 30;
const CHART_PADDING = 10;
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

export interface ChartDownloadSpec {
  svgXml: string;
  chartDate: string;
  chartHeight: number;
  chartHtml: string;
  chartTitle: string;
  chartWidth: number;
  sources: string[];
  getDataCsv?: () => Promise<string>;
}

interface ChartDownloadPropsType {
  chartDownloadSpec: ChartDownloadSpec;
  container?: HTMLElement;
  isOpen?: boolean;
  toggleCallback?: () => void;
}

/**
 * A component to include with each Chart, that displays downloadable SVG and
 * data for a chart in a Modal
 */
export function ChartDownload(props: ChartDownloadPropsType): JSX.Element {
  const [dataCsv, setDataCsv] = useState("");
  const [chartDownloadXml, setChartDownloadXml] = useState("");
  const svgContainerElement = useRef<HTMLDivElement>(null);
  const textareaElement = useRef<HTMLTextAreaElement>(null);
  const modalId = randDomId();

  useEffect(() => {
    const computeDataCsv = async () => {
      if (!dataCsv && props.chartDownloadSpec.getDataCsv) {
        try {
          const fetchedDataCsv = await props.chartDownloadSpec.getDataCsv();
          if (!fetchedDataCsv) {
            setDataCsv("Error fetching CSV");
            return;
          }
          setDataCsv(fetchedDataCsv);
        } catch (e) {
          setDataCsv("Error fetching CSV");
        }
      }
    };
    computeDataCsv();
  }, [dataCsv, props]);

  return (
    <Modal
      isOpen={props.isOpen}
      toggle={props.toggleCallback}
      className="modal-dialog-centered modal-lg chart-footer-modal"
      container={props.container}
      onOpened={onOpened}
      id={modalId}
    >
      <ModalHeader toggle={props.toggleCallback}>
        {intl.formatMessage({
          defaultMessage: "Download this chart",
          description:
            "Text for the hyperlink text that will let users download data and download charts.",
          id: "download_export_chart_link",
        })}
      </ModalHeader>
      <ModalBody>
        {props.chartDownloadSpec.svgXml && (
          <div
            ref={svgContainerElement}
            className={`modal-chart-container ${ASYNC_ELEMENT_HOLDER_CLASS}`}
          ></div>
        )}
        {dataCsv && (
          <textarea
            className="modal-textarea"
            value={dataCsv}
            readOnly
            ref={textareaElement}
            onClick={onClickTextarea}
            rows={10}
          ></textarea>
        )}
      </ModalBody>
      <ModalFooter>
        {chartDownloadXml && (
          <DownloadButton
            label="SVG"
            content={chartDownloadXml}
            filename={`${props.chartDownloadSpec.chartTitle || "chart"}.svg`}
            onClick={() => triggerGAEvent(GA_EVENT_TILE_DOWNLOAD_IMG, {})}
          />
        )}
        {dataCsv && (
          <>
            <DownloadButton
              label="CSV"
              content={dataCsv}
              filename={`${props.chartDownloadSpec.chartTitle || "chart"}.csv`}
              onClick={() => triggerGAEvent(GA_EVENT_TILE_DOWNLOAD_CSV, {})}
            />
            <CopyButton textToCopy={dataCsv} label="Copy values" />
            <IconButton label="Close" onClick={props.toggleCallback} primary />
          </>
        )}
      </ModalFooter>
    </Modal>
  );

  /**
   * On click handler on the text area.
   * - If the user clicks on the text area and doesn't drag the mouse,
   *   select all of the text (to help them copy and paste)
   * - If the user clicks and drags, don't select all of the text and allow them
   *   to make their selection
   */
  function onClickTextarea(): void {
    const selection = window.getSelection().toString();
    // User is trying to select specific text.
    if (selection) {
      return;
    }
    // User single-clicked without dragging. Select the entire CSV text
    textareaElement.current.focus();
    textareaElement.current.setSelectionRange(
      0,
      textareaElement.current.value.length
    );
  }

  function onOpened(): void {
    if (!svgContainerElement.current) {
      return;
    }
    if (textareaElement.current) {
      textareaElement.current.style.width =
        props.chartDownloadSpec.chartWidth + CHART_PADDING * 2 + "px";
    }

    if (props.chartDownloadSpec.chartHtml || props.chartDownloadSpec.svgXml) {
      const decoratedChartDownloadXml = decorateChart();
      const imageElement = document.createElement("img");
      const chartBase64 =
        "data:image/svg+xml," + encodeURIComponent(decoratedChartDownloadXml);
      imageElement.src = chartBase64;
      svgContainerElement.current.append(imageElement);
      imageElement.className = ASYNC_ELEMENT_CLASS;
      setChartDownloadXml(decoratedChartDownloadXml);
    }
  }

  function decorateChart(): string {
    const container = svgContainerElement.current;
    container.innerHTML = "";
    const chartWidth = props.chartDownloadSpec.chartWidth + 2 * CHART_PADDING;

    if (!props.chartDownloadSpec.svgXml && !props.chartDownloadSpec.chartHtml) {
      return "";
    }

    // Decorate a hidden chart svg with title and provenance
    const svg = d3
      .select(container)
      .append("svg")
      .attr("xmlns", SVGNS)
      .attr("xmlns:xlink", XLINKNS)
      .attr("width", chartWidth);

    const title = svg
      .append("g")
      .append("text")
      .style("font-family", "sans-serif")
      .style("fill", "#3b3b3b")
      .style("font-size", ".85rem")
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .text(
        `${props.chartDownloadSpec.chartTitle} ${props.chartDownloadSpec.chartDate}`
      )
      .call(wrap, props.chartDownloadSpec.chartWidth);
    const titleHeight = title.node().getBBox().height;
    title.attr("transform", `translate(${chartWidth / 2}, ${TITLE_Y})`);

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${titleHeight + TITLE_MARGIN})`
      );

    if (props.chartDownloadSpec.svgXml) {
      svg.append("svg").html(props.chartDownloadSpec.svgXml);
    } else {
      svg
        .append("svg")
        .append("foreignObject")
        .attr("width", chartWidth)
        .attr("height", 500)
        .append("xhtml:div")
        .style("font", "14px 'Helvetica Neue'")
        .html(props.chartDownloadSpec.chartHtml);
    }

    const sources = svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${
          titleHeight +
          TITLE_MARGIN +
          props.chartDownloadSpec.chartHeight +
          SOURCES_MARGIN
        })`
      )
      .append("text")
      .style("fill", "#3b3b3b")
      .style("font-family", "sans-serif")
      .style("font-size", ".7rem")
      .text(
        intl.formatMessage(
          {
            defaultMessage: "Data from {sources} via Data Commons",
            description:
              'Used to cite where the data is from, but that it was provided through Data Commons. For example, "Data from {nytimes.com} via Data Commons" or "Data from {census.gov, nytimes.com} via Data Commons". Please keep the name "Data Commons".',
            id: "embed_citation",
          },
          {
            sources: props.chartDownloadSpec.sources
              .map((s) => urlToDisplayText(s))
              .join(", "),
          }
        )
      )
      .call(wrap, props.chartDownloadSpec.chartWidth);

    const sourcesHeight = sources.node().getBBox().height;
    svg.attr(
      "height",
      props.chartDownloadSpec.chartHeight +
        titleHeight +
        TITLE_MARGIN +
        sourcesHeight +
        SOURCES_MARGIN
    );
    const s = new XMLSerializer();
    const svgXml = s.serializeToString(svg.node());
    container.innerHTML = "";

    return svgXml;
  }
}
