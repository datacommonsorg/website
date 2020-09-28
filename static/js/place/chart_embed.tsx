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

interface ChartEmbedPropType {}

interface ChartEmbedStateType {
  modal: boolean;
  svgHTML: string;
}

class ChartEmbed extends React.Component<
  ChartEmbedPropType,
  ChartEmbedStateType
> {
  modalElement: React.RefObject<HTMLDivElement>;

  constructor(props: ChartEmbedPropType) {
    super(props);
    this.state = {
      modal: false,
      svgHTML: "",
    };
    this.modalElement = React.createRef();
    this.toggle = this.toggle.bind(this);
  }

  public toggle() {
    this.setState({
      modal: !this.state.modal,
    });
  }

  public show(svgHTML: string) {
    this.setState({
      modal: true,
      svgHTML: svgHTML,
    });
  }

  render(): JSX.Element {
    return (
      <Modal
        isOpen={this.state.modal}
        toggle={this.toggle}
        // className={this.props.className}
      >
        <ModalHeader toggle={this.toggle}>Modal title</ModalHeader>
        <ModalBody>{this.state.svgHTML}</ModalBody>
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
