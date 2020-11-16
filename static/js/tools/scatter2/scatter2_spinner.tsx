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
