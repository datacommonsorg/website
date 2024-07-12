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

/* Wrapper component around all side-by-side feedback components */

import React, { useContext } from "react";

import { loadSpinner, removeSpinner } from "../../../shared/util";
import { FEEDBACK_PANE_ID } from "../constants";
import { SessionContext } from "./context";
import { saveRatingToStore } from "./data_store";
import { Navigation } from "./navigation";
import { Rating, SxsPreference } from "./types";

interface SxsFeedbackPropType {
  leftSheetId: string;
  rightSheetId: string;
  sessionId: string;
  sortedQueryIds: number[];
  userEmail: string;
}

export function SxsFeedback(props: SxsFeedbackPropType): JSX.Element {
  const { sessionQueryId } = useContext(SessionContext);

  const checkAndSubmit = () => {
    const rating: Rating = {
      leftSheetId: props.leftSheetId,
      // TODO Get these values from input elements and throw if they're empty.
      preference: SxsPreference.NEUTRAL,
      reason: "because",
      rightSheetId: props.rightSheetId,
    };
    loadSpinner(FEEDBACK_PANE_ID);
    return saveRatingToStore(
      props.userEmail,
      props.leftSheetId,
      props.rightSheetId,
      sessionQueryId,
      props.sessionId,
      rating
    )
      .then(() => true)
      .finally(() => removeSpinner(FEEDBACK_PANE_ID));
  };

  return (
    <div className="feedback-pane feedback-pane-footer" id={FEEDBACK_PANE_ID}>
      <div className="content">
        <p>Inputs go here.</p>
        <p>left: {props.leftSheetId}.</p>
        <p>right: {props.rightSheetId}.</p>
      </div>
      <Navigation
        sortedQueryIds={props.sortedQueryIds}
        checkAndSubmit={checkAndSubmit}
      />
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );
}
