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

/* Component to show the full list of SxS evaluation queries */

import React, { useContext, useState } from "react";
import { Button, Modal } from "reactstrap";

import { AllQuery } from "../types";
import { SessionContext } from "./context";
import { getRatedQueryIds } from "./data_store";

interface EvalListPropType {
  leftSheetId: string;
  rightSheetId: string;
  sessionId: string;
  sortedQueryIds: number[];
  allQuery: AllQuery;
}

export function EvalList(props: EvalListPropType): JSX.Element {
  const { sessionQueryId, setSessionQueryId } = useContext(SessionContext);

  const [modalOpen, setModalOpen] = useState(false);
  const toggleModal = () => void setModalOpen(!modalOpen);

  // Keys are query IDs and values are true if query eval is complete.
  const [queryCompletionStatus, setQueryCompletionStatus] = useState<
    Record<number, boolean>
  >({});

  const [completedCount, setCompletedCount] = useState<number>(0);

  const openModal = () => {
    setModalOpen(true);
    getRatedQueryIds(
      props.leftSheetId,
      props.rightSheetId,
      props.sessionId
    ).then((completedIds) => {
      let updatedCompletedCount = 0;
      const updatedCompletionStatus: Record<number, boolean> = {};
      props.sortedQueryIds.forEach((queryId) => {
        const completed = completedIds.includes(queryId);
        updatedCompletionStatus[queryId] = completed;
        if (completed) updatedCompletedCount++;
      });
      setQueryCompletionStatus(updatedCompletionStatus);
      setCompletedCount(updatedCompletedCount);
    });
  };

  return (
    <>
      <Button className="eval-list-button" onClick={openModal}>
        <div>
          <span className="material-icons-outlined">list_alt</span>
          Evaluation list
        </div>
      </Button>
      <Modal
        className="eval-list-modal"
        isOpen={modalOpen}
        toggle={toggleModal}
      >
        <div className="header">
          <div className="title">
            Evaluations ({completedCount} of {props.sortedQueryIds.length}{" "}
            completed)
          </div>
        </div>
        <div className="body">
          {props.sortedQueryIds.map((queryId) => {
            const completed = queryCompletionStatus[queryId];
            return (
              <div
                className={
                  `eval-list-query` +
                  `${completed ? " completed" : ""}` +
                  `${sessionQueryId === queryId ? " current" : ""}`
                }
                onClick={() => {
                  setModalOpen(false);
                  setSessionQueryId(queryId);
                }}
                key={queryId}
              >
                <div className="material-icons">
                  {completed ? "check_circle" : "radio_button_unchecked"}
                </div>
                <div className="query-name">
                  Q{queryId} &#183; {props.allQuery[queryId]?.text || ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className="footer">
          <Button
            onClick={() => setModalOpen(false)}
            className="btn-transparent"
          >
            <div>Close</div>
          </Button>
        </div>
      </Modal>
    </>
  );
}
