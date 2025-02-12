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
 * TODO(beets): Don't update the modal with stat var names if it's already opened.
 */

import React, { useEffect, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { intl } from "../../i18n/i18n";
import { tileMessages } from "../../i18n/i18n_tile_messages";
import { StatVarSpec } from "../../shared/types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { apiRootToHostname } from "../../utils/url_utils";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";

interface TileMetadataModalPropType {
  statVarSpecs: StatVarSpec[];
  containerRef?: React.RefObject<HTMLElement>;
  apiRoot?: string;
}

// [dcid, name]
type DcidNameTuple = [string, string];

function MetadataRow(props: {
  dcid: string;
  name: string;
  apiRoot?: string;
}): JSX.Element {
  return (
    <div className="metadata-modal-link">
      <span className="material-icons-outlined">arrow_forward</span>
      <a
        href={
          apiRootToHostname(props.apiRoot) +
          SV_EXPLORER_REDIRECT_PREFIX +
          props.dcid
        }
        target="_blank"
        rel="noreferrer"
      >
        {props.name}
      </a>
    </div>
  );
}

export function TileMetadataModal(
  props: TileMetadataModalPropType
): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [statVarNames, setStatVarNames] = useState<DcidNameTuple[]>([]);
  const dcids = new Set<string>();
  const toggleModal = (): void => setModalOpen(!modalOpen);
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);
  if (props.statVarSpecs) {
    for (const spec of props.statVarSpecs) {
      dcids.add(spec.statVar);
      if (spec.denom) {
        dcids.add(spec.denom);
      }
    }
  }

  useEffect(() => {
    // Only fetch data once the modal is opened.
    if (!modalOpen) return;
    if (dcids.size == statVarNames.length) return;
    (async (): Promise<void> => {
      const responseObj = await dataCommonsClient.getFirstNodeValues({
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
  }, [props, modalOpen, dcids, statVarNames.length]);

  return (
    <>
      <a
        href="#"
        onClick={(e): void => {
          e.preventDefault();
          setModalOpen(true);
        }}
      >
        {intl.formatMessage(tileMessages.showMetadata)}
      </a>
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          scrollable
          container={props.containerRef.current}
          toggle={toggleModal}
          className="metadata-modal modal-dialog-centered modal-lg"
        >
          <ModalHeader toggle={toggleModal} close={<></>}>
            {intl.formatMessage(tileMessages.chooseVariable)}
          </ModalHeader>
          <div className="modal-subtitle">
            {intl.formatMessage(tileMessages.selectVariable)}
          </div>
          <ModalBody>
            <div className="metadata-modal-links">
              {statVarNames.length
                ? statVarNames.map((dcidName, i) => (
                    <MetadataRow
                      dcid={dcidName[0]}
                      name={dcidName[1]}
                      apiRoot={props.apiRoot}
                      key={i}
                    />
                  ))
                : // Use DCID as display name as a fallback. Note, might not be displayed in order.
                  [...dcids].map((dcid, i) => (
                    <MetadataRow
                      dcid={dcid}
                      name={dcid}
                      apiRoot={props.apiRoot}
                      key={i}
                    />
                  ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              className="modal-close"
              onClick={(): void => {
                setModalOpen(false);
              }}
            >
              {intl.formatMessage(tileMessages.close)}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
