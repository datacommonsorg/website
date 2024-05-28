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

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#";

interface TileMetadataModalPropType {
  // sources?
  svList: {
    name: string;
    dcid: string;
  }[];
}

export function TileMetadataModal(props: TileMetadataModalPropType): JSX.Element {
  // const { svList } = props;
  const svList = [
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
    { name: "Population 1", dcid:"foo" },
  ];
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
    <a href="#" onClick={() => {setModalOpen(true)}}>show metadata</a>
    <Modal
      isOpen={modalOpen}
      scrollable
      className="metadata-modal modal-dialog-centered modal-lg"
    >
      <ModalHeader toggle={() => setModalOpen(false)} close={<></>}>
        Choose a variable to view its metadata
        <h6>
          Select a variable from the list to see its details. The links below
          open the Statistical Variable Explorer in a new tab.
        </h6>
      </ModalHeader>
      <ModalBody>
        <div className="metadata-modal-links">
          {svList.map(sv => (
            <div className="metadata-modal-link">
              <span className="material-icons-outlined">arrow_forward</span>
              <a href={SV_EXPLORER_REDIRECT_PREFIX + sv.dcid} target="_blank">{sv.name}</a>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button className="modal-close" onClick={() => {setModalOpen(false)}}>Close</Button>
      </ModalFooter>
    </Modal>
    </>
  );
}
