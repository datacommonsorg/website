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
 * Displays a modal with links for each stat var to their page in Stat Var Explorer.
 */

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { StatVarSpec } from "../../shared/types";
import { datacommonsClient } from "../../utils/datacommons_client";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";

interface TileMetadataModalPropType {
  statVarSpecs: StatVarSpec[];
}

type Dcid = string;
type Name = string;
type DcidNameTuple = [Dcid, Name];

export function TileMetadataModal(
  props: TileMetadataModalPropType
): JSX.Element {
  const { statVarSpecs } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const [statVarNames, setStatVarNames] = useState<DcidNameTuple[]>([]);
  const dcids = new Set<string>();

  if (!statVarSpecs) return;
  for (const spec of statVarSpecs) {
    dcids.add(spec.statVar);
    if (spec.denom) {
      dcids.add(spec.denom);
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    if (dcids.size == statVarNames.length) return;
    (async () => {
      const responseObj = await datacommonsClient.getFirstNodeValues({
        dcids: [...dcids],
        prop: "name",
      });
      const responseList = new Array<DcidNameTuple>();
      for (const dcid in responseObj) {
        responseList.push([dcid, responseObj[dcid]]);
      }
      // Sort by name
      responseList.sort((a, b) => (a[1] > b[1] ? 1 : -1));
      setStatVarNames(responseList);
    })();
  }, [props, modalOpen]);

  return (
    <>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setModalOpen(true);
        }}
      >
        show metadata
      </a>
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          scrollable
          keyboard
          className="metadata-modal modal-dialog-centered modal-lg"
        >
          <ModalHeader toggle={() => setModalOpen(false)} close={<></>}>
            Choose a variable to view its metadata
          </ModalHeader>
          <div className="modal-subtitle">
            Select a variable from the list to see its details. The links below
            open the Statistical Variable Explorer in a new tab.
          </div>
          <ModalBody>
            <div className="metadata-modal-links">
              {statVarNames &&
                statVarNames.map((dcidName, i) => (
                  <div className="metadata-modal-link" key={i}>
                    <span className="material-icons-outlined">
                      arrow_forward
                    </span>
                    <a
                      href={SV_EXPLORER_REDIRECT_PREFIX + dcidName[0]}
                      target="_blank"
                    >
                      {dcidName[1]}
                    </a>
                  </div>
                ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              className="modal-close"
              onClick={() => {
                setModalOpen(false);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
