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

import React from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { randDomId, saveToFile } from "../shared/util";
import * as d3 from "d3";

// SVG adjustment related constants
const TITLE_HEIGHT = 20;
const TITLE_MARGIN = 10;
const SOURCES_HEIGHT = 10;
const SOURCES_MARGIN = 30;
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

interface ChartEmbedStateType {
  modal: boolean;
  svgXml: string;
  dataCsv: string;
  chartWidth: number;
  chartHeight: number;
  chartTitle: string;
  chartDate: string;
  sources: string[];
}

/**
 * A component to include with each Chart, that displays embed information and data for a chart
 * in a Modal
 */
class ChartEmbed extends React.Component<unknown, ChartEmbedStateType> {
  private chartDownloadXml: string;
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
      chartTitle: "",
      chartDate: "",
      sources: [],
    };
    this.chartDownloadXml = "";
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
    chartTitle: string,
    chartDate: string,
    sources: string[]
  ): void {
    this.setState({
      modal: true,
      svgXml: svgXml,
      dataCsv: dataCsv,
      chartWidth: chartWidth,
      chartHeight: chartHeight,
      chartTitle: chartTitle,
      chartDate: chartDate ? "(" + chartDate + ")" : "",
      sources: sources,
    });
  }

  /**
   * Decorates svgXml with title and provenance information embeded in an enclosing
   * SVG node. Returns the SVG contents as a string.
   */
  private decorateSvgChart(): string {
    const container = this.svgContainerElement.current;
    container.innerHTML = "";

    // Decorate a hidden chart svg with title and provenance
    const svg = d3
      .select(container)
      .append("svg")
      .attr("xmlns", SVGNS)
      .attr("xmlns:xlink", XLINKNS)
      .attr("width", this.state.chartWidth)
      .attr(
        "height",
        this.state.chartHeight +
          TITLE_HEIGHT +
          TITLE_MARGIN +
          SOURCES_HEIGHT +
          SOURCES_MARGIN
      );

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${this.state.chartWidth / 2}, ${TITLE_HEIGHT})`
      )
      .append("text")
      .style("font-family", "sans-serif")
      .style("fill", "#3b3b3b")
      .style("font-size", ".85rem")
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .text(`${this.state.chartTitle} ${this.state.chartDate}`);

    svg
      .append("g")
      .attr("transform", `translate(0, ${TITLE_HEIGHT + TITLE_MARGIN})`)
      .append("svg")
      .html(this.state.svgXml);

    svg
      .append("g")
      .attr(
        "transform",
        `translate(5, ${
          TITLE_HEIGHT + TITLE_MARGIN + this.state.chartHeight + SOURCES_MARGIN
        })`
      )
      .append("text")
      .style("fill", "#3b3b3b")
      .style("font-family", "sans-serif")
      .style("font-size", ".7rem")
      .text(`Data from ${this.state.sources.join(",")} via Data Commons`);

    const svgXml = svg.node().outerHTML;
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
      this.textareaElement.current.style.width = this.state.chartWidth + "px";
    }

    this.chartDownloadXml = this.decorateSvgChart();

    const imageElement = document.createElement("img");
    const chartBase64 =
      "data:image/svg+xml;base64," + btoa(this.chartDownloadXml);
    imageElement.src = chartBase64;
    this.svgContainerElement.current.append(imageElement);
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
    saveToFile("chart.svg", this.chartDownloadXml);
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
        <ModalHeader toggle={this.toggle}>Export this chart</ModalHeader>
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
          <Button color="primary" onClick={this.onDownloadSvg}>
            Download Chart Image
          </Button>{" "}
          <Button color="primary" onClick={this.onDownloadData}>
            Download Data as CSV
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export { ChartEmbed };
