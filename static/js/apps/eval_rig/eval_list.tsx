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

/* Component to show the full list of evaluation queries */

import { User } from "firebase/auth";
import React, { useState } from "react";
import { Button, Input, Modal } from "reactstrap";

import { getCallExistence } from "./data_store";
import { DcCall } from "./eval_section";
import { Query } from "./query_section";

interface EvalListPropType {
  user: User;
  sheetId: string;
  queries: Record<string, Query>;
  calls: Record<string, DcCall[]>;
  onQuerySelected: (query: Query) => void;
}

export function EvalList(props: EvalListPropType): JSX.Element {
  const [userEvalsOnly, setUserEvalsOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [queryCompletionStatus, setQueryCompletionStatus] = useState({});

  const userLdap = props.user.email.split("@")[0];
  const orderedQueries = Object.keys(props.queries)
    .sort()
    .map((queryId) => props.queries[queryId]);

  const openModal = () => {
    setModalOpen(true);
    const existPromises = orderedQueries.map((query) => {
      return Promise.all(
        props.calls[query.id].map((call) => {
          return getCallExistence(props.sheetId, query.id, call.id);
        })
      );
    });
    const queryCompletionStatus = {};
    Promise.all(existPromises)
      .then((results) => {
        orderedQueries.forEach((query, i) => {
          const completed = results[i].every(Boolean);
          queryCompletionStatus[query.id] = completed;
        });
        setQueryCompletionStatus(queryCompletionStatus);
      })
      .finally(() => {
        setQueryCompletionStatus(queryCompletionStatus);
      });
  };

  return (
    <>
      <Button className="eval-list-button" onClick={openModal}>
        Evaluation list
      </Button>
      <Modal isOpen={modalOpen} className="eval-list-modal">
        <div className="header">
          <div className="title">Choose a query to start evaluating from</div>
          <div className="subtitle">
            <div className="subtitle-message">
              Select a query to start evaluating, evaluated queries are marked
              in green.
            </div>
            <div className="filter-checkbox">
              <Input
                type="checkbox"
                checked={userEvalsOnly}
                onChange={() => {
                  setUserEvalsOnly(!userEvalsOnly);
                }}
              />
              <span>Show my questions only</span>
            </div>
          </div>
        </div>
        <div className="body">
          {orderedQueries.map((query) => {
            if (userEvalsOnly && query.user !== userLdap) {
              return null;
            }
            const completed = queryCompletionStatus[query.id];
            return (
              <div
                className={`eval-list-query${completed ? " completed" : ""}`}
                onClick={() => {
                  setModalOpen(false);
                  props.onQuerySelected(query);
                }}
                key={query.id}
              >
                <div className="material-icons-outlined">
                  {completed ? "check" : "chevron_right"}
                </div>
                <div className="query-name">
                  Q{query.id} &#183; {query.text}
                </div>
                <div className="user">{query.user}</div>
              </div>
            );
          })}
        </div>
        <div className="footer">
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  );
}
