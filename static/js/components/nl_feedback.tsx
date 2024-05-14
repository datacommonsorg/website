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
import { CHART_FEEDBACK_SENTIMENT, getNlChartId } from "../utils/explore_utils";

class Option {
  icon: string;
  sentiment: string;
  tooltip: string;
}

const FEEDBACK_OPTIONS: Option[] = [
  {
    icon: "thumb_up",
    sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_UP,
    tooltip: "The chart is relevant for the query",
  },
  {
    icon: "thumb_down",
    sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN,
    tooltip: "The chart is not relevant for the query",
  },
  {
    icon: "move_up",
    sentiment: CHART_FEEDBACK_SENTIMENT.PROMOTE,
    tooltip: "The chart should be promoted up",
  },
  {
    icon: "move_down",
    sentiment: CHART_FEEDBACK_SENTIMENT.DEMOTE,
    tooltip: "The chart should be demoted",
  },
  {
    icon: "priority_high",
    sentiment: CHART_FEEDBACK_SENTIMENT.FACE_PALM,
    tooltip: "The chart is embarrassing or inappropriate for the query",
  },
];

interface EmojiPropType {
  id: string;
  option: Option;
  saved: boolean;
  action: (sentiment: string, comment: string) => void;
}

function Emoji(props: EmojiPropType): JSX.Element {
  const [isPopUpVisible, setPopUpVisible] = useState(false);
  const [textInput, setTextInput] = useState("");

  const handleElementClick = () => {
    if (props.saved) {
      return;
    }
    setPopUpVisible(true);
  };

  const handlePopUpClose = () => {
    setPopUpVisible(false);
  };

  const handleInputChange = (event) => {
    setTextInput(event.target.value);
  };

  const handleSubmit = () => {
    // Do something with the submitted text, for example, send it to a server.
    props.action(props.option.sentiment, textInput);
    // Close the pop-up after submission
    setPopUpVisible(false);
  };

  return (
    <>
      <div>
        <span
          className={`material-icons-outlined feedback-emoji ${
            props.saved ? "feedback-emoji-dim" : ""
          }`}
          id={`${props.id}-${props.option.sentiment}`}
          onClick={() => handleElementClick()}
        >
          {props.option.icon}
        </span>
        {!props.saved && (
          <UncontrolledTooltip
            boundariesElement="window"
            delay={200}
            placement="top"
            target={`${props.id}-${props.option.sentiment}`}
          >
            {props.option.tooltip}
          </UncontrolledTooltip>
        )}
      </div>
      {isPopUpVisible && (
        <>
          <div className="popup-box">
            <textarea
              value={textInput}
              onChange={handleInputChange}
              placeholder="Enter your feedback here"
              rows={5}
              cols={30}
            />
            <button onClick={handleSubmit}>Submit</button>
            <button onClick={handlePopUpClose}>Close</button>
          </div>
        </>
      )}
    </>
  );
}

interface NlChartFeedbackPropType {
  // This is a fixed ID format string
  // e.g., "pg0_cat_1_blk_2_col_3_tile_4"
  id: string;
}

export function NlChartFeedback(props: NlChartFeedbackPropType): JSX.Element {
  const nlSessionId = useContext(NlSessionContext);
  const [saved, setSaved] = useState(false);

  const saveFeedback = useCallback(
    (sentiment: string, comment: string) => {
      if (saved) {
        return;
      }
      setSaved(true);
      axios.post("/api/explore/feedback", {
        feedbackData: {
          chartId: getNlChartId(props.id),
          comment,
          sentiment,
        },
        sessionId: nlSessionId,
      });
    },
    [nlSessionId, saved, props.id]
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
          <Emoji
            key={i}
            id={props.id}
            option={option}
            saved={saved}
            action={saveFeedback}
          ></Emoji>
        ))}
      </div>
    </div>
  );
}
