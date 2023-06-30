/**
 * Copyright 2023 Google LLC
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
 * Per-chart feedback for NL.
 */

import axios from "axios";
import React, { useContext, useState } from "react";

import { NlSessionContext } from "../shared/context";
import {
  CHART_FEEDBACK_SENTIMENT,
  getNlChartId,
} from "../utils/nl_interface_utils";

interface NlChartFeedbackPropType {
  // This is a fixed ID format string
  // e.g., "pg0_cat_1_blk_2_col_3_tile_4"
  id: string;
}

export function NlChartFeedback(props: NlChartFeedbackPropType): JSX.Element {
  const nlSessionId = useContext(NlSessionContext);
  const [isEmojiClicked, setIsEmojiClicked] = useState(false);
  if (!nlSessionId) {
    return <></>;
  }
  return (
    <div className="nl-feedback">
      <span
        className={`feedback-emoji ${
          isEmojiClicked ? "feedback-emoji-dim" : ""
        }`}
        onClick={() => {
          return onChartClick(
            props.id,
            nlSessionId,
            isEmojiClicked,
            setIsEmojiClicked,
            CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN
          );
        }}
      >
        &#128078;
      </span>
      <span
        className={`feedback-emoji ${
          isEmojiClicked ? "feedback-emoji-dim" : ""
        }`}
        onClick={() => {
          return onChartClick(
            props.id,
            nlSessionId,
            isEmojiClicked,
            setIsEmojiClicked,
            CHART_FEEDBACK_SENTIMENT.WARNING
          );
        }}
      >
        &nbsp;&nbsp;&#9888;
      </span>
      <span
        className={`feedback-emoji ${
          isEmojiClicked ? "feedback-emoji-dim" : ""
        }`}
        onClick={() => {
          return onChartClick(
            props.id,
            nlSessionId,
            isEmojiClicked,
            setIsEmojiClicked,
            CHART_FEEDBACK_SENTIMENT.PROMOTE
          );
        }}
      >
        &nbsp;&nbsp;&#11014;
      </span>
      <span
        className={`feedback-emoji ${
          isEmojiClicked ? "feedback-emoji-dim" : ""
        }`}
        onClick={() => {
          return onChartClick(
            props.id,
            nlSessionId,
            isEmojiClicked,
            setIsEmojiClicked,
            CHART_FEEDBACK_SENTIMENT.DEMOTE
          );
        }}
      >
        &nbsp;&nbsp;&#11015;
      </span>
      <span
        className={`feedback-emoji ${
          isEmojiClicked ? "feedback-emoji-dim" : ""
        }`}
        onClick={() => {
          return onChartClick(
            props.id,
            nlSessionId,
            isEmojiClicked,
            setIsEmojiClicked,
            CHART_FEEDBACK_SENTIMENT.FACE_PALM
          );
        }}
      >
        &nbsp;&nbsp;&#129318;&#127995;

      </span>
    </div>
  );
}

//
// Invoked when feedback emoji is clicked on a chart.
//
function onChartClick(
  idStr: string,
  nlSessionId: string,
  isEmojiClicked: boolean,
  setIsEmojiClicked: (boolean) => void,
  sentiment: string
): void {
  if (isEmojiClicked) {
    return;
  }
  setIsEmojiClicked(true);
  axios.post("/api/nl/feedback", {
    feedbackData: {
      chartId: getNlChartId(idStr),
      sentiment,
    },
    sessionId: nlSessionId,
  });
}
