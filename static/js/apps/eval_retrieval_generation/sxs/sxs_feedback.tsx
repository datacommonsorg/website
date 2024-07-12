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

import React, { useContext, useEffect, useState } from "react";

import { loadSpinner, removeSpinner } from "../../../shared/util";
import { FEEDBACK_PANE_ID } from "../constants";
import { SessionContext } from "./context";
import { getStoredRating, saveRatingIfChanged } from "./data_store";
import { FeedbackForm } from "./feedback_form";
import { Navigation } from "./navigation";
import { getFlipped } from "./rating_util";
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
  const [disabled, setDisabled] = useState<boolean>(false);
  const [preference, setPreference] = useState<SxsPreference>(null);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    setDisabled(true);
    getStoredRating(
      props.leftSheetId,
      props.rightSheetId,
      sessionQueryId,
      props.sessionId
    ).then((storedRating: Rating | null) => {
      let ratingToDisplay = storedRating;
      if (storedRating && storedRating.leftSheetId !== props.leftSheetId) {
        // Newly-calculated left/right orientation takes priority over storage.
        ratingToDisplay = getFlipped(storedRating);
      }
      setPreference(ratingToDisplay?.preference ?? null);
      setReason(ratingToDisplay?.reason ?? "");
      setDisabled(false);
    });
  }, [props.leftSheetId, props.rightSheetId, props.sessionId, sessionQueryId]);

  const checkAndSubmit = () => {
    if (!preference) {
      if (reason) {
        alert("Please choose a preferred answer.");
        return Promise.resolve(false);
      } else {
        // Form is empty; skip saving.
        return Promise.resolve(true);
      }
    }
    const newRating: Rating = {
      leftSheetId: props.leftSheetId,
      preference,
      reason,
      rightSheetId: props.rightSheetId,
    };
    loadSpinner(FEEDBACK_PANE_ID);
    return saveRatingIfChanged(
      props.userEmail,
      props.leftSheetId,
      props.rightSheetId,
      sessionQueryId,
      props.sessionId,
      newRating
    )
      .then(() => true)
      .finally(() => removeSpinner(FEEDBACK_PANE_ID));
  };

  return (
    <div className="feedback-pane feedback-pane-footer" id={FEEDBACK_PANE_ID}>
      <div className="content">
        <FeedbackForm
          disabled={disabled}
          preference={preference}
          reason={reason}
          setPreference={setPreference}
          setReason={setReason}
        ></FeedbackForm>
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
