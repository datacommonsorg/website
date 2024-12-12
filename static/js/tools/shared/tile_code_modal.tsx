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

/**
 * Displays a modal with code users can use to embed the tile
 */

import React, { useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import {
  CopyButton,
  IconButton,
} from "../../components/form_components/icon_buttons";

interface TileCodeModalPropType {
  containerRef?: React.RefObject<HTMLElement>;
  sourceCode: string;
}

export function TileCodeModal(props: TileCodeModalPropType): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const toggleModal = () => setModalOpen(!modalOpen);

  return (
    <>
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setModalOpen(true);
        }}
      >
        Embed this chart
      </a>
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          scrollable
          container={props.containerRef?.current}
          toggle={toggleModal}
          className="metadata-modal modal-dialog-centered modal-lg"
        >
          <ModalHeader toggle={toggleModal} close={<></>}>
            Embed this chart
          </ModalHeader>
          <div className="modal-subtitle">
            Use the following code to embed this chart on your website. For{" "}
            documentation, see our{" "}
            <a
              href="https://docs.datacommons.org/api/web_components/"
              rel="noreferrer"
              target="_blank"
            >
              web component documentation
            </a>
            .
          </div>
          <ModalBody>
            <textarea
              className="modal-textarea"
              readOnly
              value={props.sourceCode}
            >
              {props.sourceCode}
            </textarea>
          </ModalBody>
          <ModalFooter>
            <CopyButton textToCopy={props.sourceCode} />
            <IconButton
              emphasized
              onClick={() => {
                setModalOpen(false);
              }}
            >
              Close
            </IconButton>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
