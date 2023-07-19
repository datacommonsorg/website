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
import React, { useCallback, useContext, useState } from "react";
import { UncontrolledTooltip } from "reactstrap";

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

const FEEDBACK_OPTIONS = [
  {
    sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_UP,
    content: <>&#128077;</>,
    tooltip: "The chart is relevant for the query",
  },
  {
    sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN,
    content: <>&#128078;</>,
    tooltip: "The chart is not relevant for the query",
  },
  {
    sentiment: CHART_FEEDBACK_SENTIMENT.PROMOTE,
    content: <>&#11014;</>,
    tooltip: "The chart should be promoted up",
  },
  {
    sentiment: CHART_FEEDBACK_SENTIMENT.DEMOTE,
    content: <>&#11015;</>,
    tooltip: "The chart should be demoted",
  },
  {
    sentiment: CHART_FEEDBACK_SENTIMENT.FACE_PALM,
    content: <>&#129318;&#127995;</>,
    tooltip: "The chart is embarassing or inappropriate for the the query",
  },
];

export function NlChartFeedback(props: NlChartFeedbackPropType): JSX.Element {
  const nlSessionId = useContext(NlSessionContext);
  const [saved, setSaved] = useState(false);

  const saveFeedback = useCallback(
    (sentiment: string) => {
      if (saved) {
        return;
      }
      setSaved(true);
      axios.post("/api/nl/feedback", {
        feedbackData: {
          chartId: getNlChartId(props.id),
          sentiment,
        },
        sessionId: nlSessionId,
      });
    },
    [nlSessionId, saved]
  );

  if (!nlSessionId) {
    return null;
  }
  return (
    <div className="nl-feedback">
      <span className="nl-feedback-text">
        {saved ? <>Feedback saved</> : null}
      </span>
      <div className="nl-feedback-actions">
        {FEEDBACK_OPTIONS.map((option, i) => (
          <React.Fragment key={i}>
            <span
              className={`feedback-emoji ${saved ? "feedback-emoji-dim" : ""}`}
              id={`${props.id}-${option.sentiment}`}
              onClick={() => saveFeedback(option.sentiment)}
            >
              {option.content}
            </span>
            {!saved && (
              <UncontrolledTooltip
                boundariesElement="window"
                delay={400}
                placement="top"
                target={`${props.id}-${option.sentiment}`}
              >
                {option.tooltip}
              </UncontrolledTooltip>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
