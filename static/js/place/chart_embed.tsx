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
import { randDomId } from "../shared/util";

interface ChartEmbedPropType {}

interface ChartEmbedStateType {
  modal: boolean;
  chartDOM: Node;
  svgHTML: string;
}

class ChartEmbed extends React.Component<
  ChartEmbedPropType,
  ChartEmbedStateType
> {
  modalElement: React.RefObject<Modal>;
  objectId: string;

  constructor(props: ChartEmbedPropType) {
    super(props);
    this.state = {
      modal: false,
      svgHTML: "",
      chartDOM: null,
    };
    this.objectId = randDomId();
    this.modalElement = React.createRef();
    this.toggle = this.toggle.bind(this);
    this.onOpened = this.onOpened.bind(this);
  }

  public toggle() {
    this.setState({
      modal: !this.state.modal,
    });
  }

  public show(svgHTML: string, chartDOM: Node) {
    this.setState({
      modal: true,
      svgHTML: svgHTML,
      chartDOM: chartDOM,
    });
  }

  public onOpened(): void {
    if (!this.modalElement.current || !this.state.chartDOM) {
      console.log(this.modalElement);
      console.log(this.state.chartDOM);
      console.log("skipping update");
      return;
    }
    let containerElem = this.modalElement.current._element.querySelector(
      ".modal-chart-container"
    );
    containerElem && containerElem.appendChild(this.state.chartDOM);
  }

  render(): JSX.Element {
    return (
      <Modal
        isOpen={this.state.modal}
        toggle={this.toggle}
        className="modal-dialog-centered modal-lg"
        onOpened={this.onOpened}
        ref={this.modalElement}
      >
        <ModalHeader>Embed this chart</ModalHeader>
        <ModalBody>
          <div className="modal-chart-container"></div>
          <textarea value={this.state.svgHTML} readOnly></textarea>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.toggle}>
            Do Something
          </Button>{" "}
          <Button color="secondary" onClick={this.toggle}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export { ChartEmbed };
