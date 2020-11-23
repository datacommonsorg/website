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

/**
 * Reactstrap Spinner component in a Modal component.
 */

import React from "react";
import { Modal, ModalBody, Spinner as StrapSpinner } from "reactstrap";

interface SpinnerProps {
  isOpen: boolean;
}

function Spinner(props: SpinnerProps): JSX.Element {
  return (
    <div>
      <Modal isOpen={props.isOpen} backdrop="static">
        <ModalBody id="spinner-modal-body">
          <StrapSpinner animation="border" id="spinner" />
        </ModalBody>
      </Modal>
    </div>
  );
}

export { Spinner };
