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
  const [isThumbClicked, setIsThumbClicked] = useState(false);
  if (!nlSessionId) {
    return <></>;
  }
  return (
    <div className="nl-feedback">
      <span
        className={`thumb-down ${isThumbClicked ? "thumb-dim" : ""}`}
        onClick={() => {
          return onChartThumbDownClick(
            props.id,
            nlSessionId,
            isThumbClicked,
            setIsThumbClicked
          );
        }}
      >
        &#128078;
      </span>
    </div>
  );
}

//
// Invoked when thumb-down is clicked on a chart.
//
function onChartThumbDownClick(
  idStr: string,
  nlSessionId: string,
  isThumbClicked: boolean,
  setIsThumbClicked: (boolean) => void
): void {
  if (isThumbClicked) {
    return;
  }
  setIsThumbClicked(true);
  axios.post("/api/nl/feedback", {
    feedbackData: {
      chartId: getNlChartId(idStr),
      sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN,
    },
    sessionId: nlSessionId,
  });
}
