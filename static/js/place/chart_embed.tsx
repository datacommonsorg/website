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

interface ChartEmbedStateType {
  modal: boolean;
  chartDom: Node;
  svgXml: string;
  dataCsv: string;
}

/**
 * A component to include with each Chart, that displays embed information and data for a chart
 * in a Modal
 */
class ChartEmbed extends React.Component<unknown, ChartEmbedStateType> {
  private textareaElement: React.RefObject<HTMLTextAreaElement>;
  private modalId: string;

  constructor(props: unknown) {
    super(props);
    this.state = {
      modal: false,
      svgXml: "",
      chartDom: null,
      dataCsv: "",
    };
    this.modalId = randDomId();
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
  public show(svgXml: string, chartDom: Node, dataCsv: string): void {
    this.setState({
      modal: true,
      svgXml: svgXml,
      chartDom: chartDom,
      dataCsv: dataCsv,
    });
  }

  /**
   * Callback for after the modal has been rendered and added to the DOM.
   */
  public onOpened(): void {
    const modalElement = document.getElementById(this.modalId);
    if (!modalElement || !this.state.chartDom) {
      return;
    }
    // Append cloned chart DOM to the modal.
    const containerElem = modalElement.querySelector(".modal-chart-container");
    if (containerElem) {
      containerElem.appendChild(this.state.chartDom);
      const chartElem = containerElem.querySelector(".chart-container");
      if (chartElem) {
        // Update width of textarea to match the width of the chart.
        const textarea = modalElement.querySelector("textarea");
        if (textarea) {
          textarea.style.width = chartElem.clientWidth + "px";
        }
      }
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
    saveToFile("chart.svg", this.state.svgXml);
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
        <ModalHeader toggle={this.toggle}>Embed this chart</ModalHeader>
        <ModalBody>
          <div className="modal-chart-container"></div>
          <textarea
            className="copy-svg mt-3"
            value={this.state.svgXml}
            readOnly
            ref={this.textareaElement}
            onClick={this.onClickTextarea}
          ></textarea>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.onDownloadSvg}>
            Download chart as SVG
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
