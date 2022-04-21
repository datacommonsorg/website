/**
 * Copyright 2022 Google LLC
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
import React, { useEffect, useRef,useState } from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";

const MODAL_MAX_WIDTH = "90vw";

interface BqModalPropType {
  showButton: boolean;
  getSqlQuery: () => string;
}

export function BqModal(props: BqModalPropType): JSX.Element {
  const textAreaRef = useRef<HTMLTextAreaElement>();
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const bqLink = useRef(
    document.getElementById("bq-link") as HTMLAnchorElement
  );
  if (bqLink.current) {
    bqLink.current.onclick = () => {
      const query = `${props.getSqlQuery()}`;
      setQuery(query);
      setModalOpen(true);
    };
  }

  useEffect(() => {
    if (bqLink.current && props.showButton) {
      bqLink.current.style.display = "inline-block";
    } else {
      bqLink.current.style.display = "none";
    }
    return () => {
      bqLink.current.style.display = "none";
    };
  });

  const textAreaOnClick = () => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(
        0,
        textAreaRef.current.value.length
      );
    }
  };

  return (
    <Modal
      isOpen={modalOpen}
      className="big-query-modal"
      style={{ maxWidth: MODAL_MAX_WIDTH }}
    >
      <ModalHeader toggle={() => setModalOpen(false)}>
        Analyze this data in BigQuery
      </ModalHeader>
      <ModalBody>
        <div className="big-query-sql-instructions">
          <div>
            To run this query, first{" "}
            <a
              href={
                "https://console.cloud.google.com/bigquery/analytics-hub/exchanges(analyticshub:projects/841968438789/locations/us/dataExchanges/data_commons_17d0b72b0b2/listings/data_commons_1803e67fbc9)?project=datcom-store"
              }
            >
              link Data Commons to Your GCP Project
            </a>
            , then copy and paste the query into the{" "}
            <a
              href={
                "https://console.cloud.google.com/bigquery;create-new-query-tab"
              }
            >
              BigQuery Editor
            </a>
            .
          </div>
          <div>
            For more information on querying Data Commons, see{" "}
            <a href={"https://docs.datacommons.org/bigquery/"}>this guide</a>.
          </div>
        </div>
        <div className="sql-text-area">
          <textarea
            className="copy-svg mt-3"
            value={query}
            readOnly
            ref={textAreaRef}
            onClick={textAreaOnClick}
          />
        </div>
      </ModalBody>
    </Modal>
  );
}
