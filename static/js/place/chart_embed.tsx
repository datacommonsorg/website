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
import React from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { wrap } from "../chart/base";
import { intl } from "../i18n/i18n";
import { randDomId, saveToFile, urlToDomain } from "../shared/util";

// SVG adjustment related constants
const TITLE_Y = 20;
const TITLE_MARGIN = 10;
const SOURCES_MARGIN = 30;
const CHART_PADDING = 10;
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

interface ChartEmbedStateType {
  modal: boolean;
  svgXml: string;
  dataCsv: string;
  chartWidth: number;
  chartHeight: number;
  chartHtml: string;
  chartTitle: string;
  chartDate: string;
  sources: string[];
  chartDownloadXml: string;
}

/**
 * A component to include with each Chart, that displays embed information and data for a chart
 * in a Modal
 */
class ChartEmbed extends React.Component<unknown, ChartEmbedStateType> {
  private modalId: string;
  private svgContainerElement: React.RefObject<HTMLDivElement>;
  private textareaElement: React.RefObject<HTMLTextAreaElement>;

  constructor(props: unknown) {
    super(props);
    this.state = {
      modal: false,
      svgXml: "",
      dataCsv: "",
      chartWidth: 0,
      chartHeight: 0,
      chartHtml: "",
      chartTitle: "",
      chartDate: "",
      sources: [],
      chartDownloadXml: "",
    };
    this.modalId = randDomId();
    this.svgContainerElement = React.createRef();
    this.textareaElement = React.createRef();

    this.toggle = this.toggle.bind(this);
    this.onOpened = this.onOpened.bind(this);
    this.onDownloadSvg = this.onDownloadSvg.bind(this);
    this.onDownloadData = this.onDownloadData.bind(this);
    this.onClickTextarea = this.onClickTextarea.bind(this);
  }

  /**
   * Toggles the view state of the modal.
   */
  public toggle(): void {
    this.setState({
      modal: !this.state.modal,
    });
  }

  /**
   * Updates the view state of the modal to true, and includes the data necessary for displaying the modal.
   */
  public show(
    svgXml: string,
    dataCsv: string,
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    chartTitle: string,
    chartDate: string,
    sources: string[]
  ): void {
    this.setState({
      modal: true,
      svgXml,
      dataCsv,
      chartWidth,
      chartHeight,
      chartHtml,
      chartTitle,
      chartDate,
      sources,
    });
  }

  /**
   * Decorates chartHtml with title and provenance information embeded in an enclosing
   * SVG node. Returns the SVG contents as a string.
   */
  private decorateChartHtml(): string {
    const container = this.svgContainerElement.current;
    container.innerHTML = "";
    const chartWidth = this.state.chartWidth + 2 * CHART_PADDING;

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
      .text(`${this.state.chartTitle} ${this.state.chartDate}`)
      .call(wrap, this.state.chartWidth);
    const titleHeight = title.node().getBBox().height;
    title.attr("transform", `translate(${chartWidth / 2}, ${TITLE_Y})`);

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${titleHeight + TITLE_MARGIN})`
      )
      .append("svg")
      .append("foreignObject")
      .attr("width", chartWidth)
      .attr("height", 500)
      .append("xhtml:div")
      .style("font", "14px 'Helvetica Neue'")
      .html(this.state.chartHtml);

    const sources = svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${
          titleHeight + TITLE_MARGIN + this.state.chartHeight + SOURCES_MARGIN
        })`
      )
      .append("text")
      .style("fill", "#3b3b3b")
      .style("font-family", "sans-serif")
      .style("font-size", ".7rem")
      .text(
        intl.formatMessage(
          {
            id: "embed_citation",
            defaultMessage: "Data from {sources} via Data Commons",
            description:
              'Used to cite where the data is from, but that it was provided through Data Commons. For example, "Data from {nytimes.com} via Data Commons" or "Data from {census.gov, nytimes.com} via Data Commons". Please keep the name "Data Commons".',
          },
          { sources: this.state.sources.map((s) => urlToDomain(s)).join(", ") }
        )
      )
      .call(wrap, this.state.chartWidth);

    const sourcesHeight = sources.node().getBBox().height;
    svg.attr(
      "height",
      this.state.chartHeight +
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

  /**
   * Decorates svgXml with title and provenance information embeded in an enclosing
   * SVG node. Returns the SVG contents as a string.
   */
  private decorateSvgChart(): string {
    const container = this.svgContainerElement.current;
    container.innerHTML = "";
    const chartWidth = this.state.chartWidth + 2 * CHART_PADDING;

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
      .text(`${this.state.chartTitle} ${this.state.chartDate}`)
      .call(wrap, this.state.chartWidth);
    const titleHeight = title.node().getBBox().height;
    title.attr("transform", `translate(${chartWidth / 2}, ${TITLE_Y})`);

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${titleHeight + TITLE_MARGIN})`
      )
      .append("svg")
      .html(this.state.svgXml);

    const sources = svg
      .append("g")
      .attr(
        "transform",
        `translate(${CHART_PADDING}, ${
          titleHeight + TITLE_MARGIN + this.state.chartHeight + SOURCES_MARGIN
        })`
      )
      .append("text")
      .style("fill", "#3b3b3b")
      .style("font-family", "sans-serif")
      .style("font-size", ".7rem")
      .text(
        intl.formatMessage(
          {
            id: "embed_citation",
            defaultMessage: "Data from {sources} via Data Commons",
            description:
              'Used to cite where the data is from, but that it was provided through Data Commons. For example, "Data from {nytimes.com} via Data Commons" or "Data from {census.gov, nytimes.com} via Data Commons". Please keep the name "Data Commons".',
          },
          { sources: this.state.sources.map((s) => urlToDomain(s)).join(", ") }
        )
      )
      .call(wrap, this.state.chartWidth);

    const sourcesHeight = sources.node().getBBox().height;
    svg.attr(
      "height",
      this.state.chartHeight +
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

  /**
   * Callback for after the modal has been rendered and added to the DOM.
   */
  public onOpened(): void {
    if (!this.svgContainerElement.current) {
      return;
    }
    if (this.textareaElement.current) {
      this.textareaElement.current.style.width =
        this.state.chartWidth + CHART_PADDING * 2 + "px";
    }

    if (this.state.chartHtml) {
      const chartDownloadXml = this.decorateChartHtml();
      const imageElement = document.createElement("img");
      const chartBase64 =
        "data:image/svg+xml," + encodeURIComponent(chartDownloadXml);
      imageElement.src = chartBase64;
      this.svgContainerElement.current.append(imageElement);
      this.setState({ chartDownloadXml });
    }

    if (this.state.svgXml) {
      const chartDownloadXml = this.decorateSvgChart();
      const imageElement = document.createElement("img");
      const chartBase64 =
        "data:image/svg+xml," + encodeURIComponent(chartDownloadXml);
      imageElement.src = chartBase64;
      this.svgContainerElement.current.append(imageElement);
      this.setState({ chartDownloadXml });
    }
  }

  /**
   * On click handler on the text area - auto-selects all the text.
   */
  public onClickTextarea(): void {
    this.textareaElement.current.focus();
    this.textareaElement.current.setSelectionRange(
      0,
      this.textareaElement.current.value.length
    );
  }

  /**
   * On click handler for "Copy SVG to clipboard button".
   */
  public onDownloadSvg(): void {
    saveToFile("chart.svg", this.state.chartDownloadXml);
  }

  /**
   * On click handler for "Download Data" button.
   */
  public onDownloadData(): void {
    saveToFile("export.csv", this.state.dataCsv);
  }

  public render(): JSX.Element {
    return (
      <Modal
        isOpen={this.state.modal}
        toggle={this.toggle}
        className="modal-dialog-centered modal-lg"
        onOpened={this.onOpened}
        id={this.modalId}
      >
        <ModalHeader toggle={this.toggle}>
          {intl.formatMessage({
            id: "embed_export_chart_link",
            defaultMessage: "Export this chart",
            description:
              "Text for the hyperlink text that will let users export data and export charts.",
          })}
        </ModalHeader>
        <ModalBody>
          <div
            ref={this.svgContainerElement}
            className="modal-chart-container"
          ></div>
          <textarea
            className="copy-svg mt-3"
            value={this.state.dataCsv}
            readOnly
            ref={this.textareaElement}
            onClick={this.onClickTextarea}
          ></textarea>
        </ModalBody>
        <ModalFooter>
          {this.state.chartDownloadXml && (
            <>
              <Button color="primary" onClick={this.onDownloadSvg}>
                {intl.formatMessage({
                  id: "embed_download_chart_link",
                  defaultMessage: "Download Chart Image",
                  description:
                    "Text for the hyperlink text that will download the chart image.",
                })}
              </Button>{" "}
            </>
          )}
          <Button color="primary" onClick={this.onDownloadData}>
            {intl.formatMessage({
              id: "embed_download_csv_link",
              defaultMessage: "Download Data as CSV",
              description:
                "Text for the hyperlink text that will download the data as a CSV.",
            })}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export { ChartEmbed };
