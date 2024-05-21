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

import axios from "axios";
import React, { useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { intl } from "../../../i18n/i18n";
import { randDomId } from "../../../shared/util";
import {
  CHART_FEEDBACK_SENTIMENT,
  getNlChartId,
} from "../../../utils/explore_utils";
import { IconButton } from "../../form_components/icon_buttons";

/** Modal for submitting feedback about the chart in an NL context */

interface ButtonStateType {
  dataSeemsOffSelected: boolean;
  doesNotMatchMyQuerySelected: boolean;
  matchesMyQuerySelected: boolean;
  negativeOtherSelected: boolean;
  positiveOtherSelected: boolean;
  thumbDownSelected: boolean;
  thumbUpSelected: boolean;
}

interface ChartFeedbackPropsType {
  // Id of the chart feedback is about
  chartId: string;
  // Containing HTML element to attach modal to
  container?: HTMLElement;
  // Whether modal is open or closed
  isOpen: boolean;
  // NL session ID to include in feedback
  nlSessionId: string;
  // function to run when modal is toggled open or closed
  toggleCallback: () => void;
}

export function ChartFeedback(props: ChartFeedbackPropsType): JSX.Element {
  const modalId = randDomId();
  const [textareaValue, setTextareaValue] = useState("");
  const [buttonState, setButtonState] = useState<ButtonStateType>({
    dataSeemsOffSelected: false,
    doesNotMatchMyQuerySelected: false,
    matchesMyQuerySelected: false,
    negativeOtherSelected: false,
    positiveOtherSelected: false,
    thumbDownSelected: false,
    thumbUpSelected: false,
  });

  if (!props.nlSessionId) {
    return null;
  }

  return (
    <Modal
      container={props.container}
      isOpen={props.isOpen}
      toggle={props.toggleCallback}
      className="modal-dialog-centered modal-lg chart-embed-modal"
      id={modalId}
    >
      <ModalHeader toggle={props.toggleCallback}>
        {intl.formatMessage({
          defaultMessage: "Rating module",
          description:
            "Text for the hyperlink text that will let users rate and leave feedback about a chart.",
          id: "embed_export_chart_link",
        })}
      </ModalHeader>
      <ModalBody>
        <div className="ratings-module-container">
          <div className="thumb-buttons-container">
            <button
              className={`thumb-button ${
                buttonState.thumbUpSelected ? "selected" : ""
              }`}
              onClick={() => {
                setButtonState({
                  ...buttonState,
                  thumbDownSelected: false,
                  thumbUpSelected: !buttonState.thumbUpSelected,
                });
              }}
            >
              <span className="material-icons-outlined icon">thumb_up</span>
            </button>
            <button
              className={`thumb-button ${
                buttonState.thumbDownSelected ? "selected" : ""
              }`}
              onClick={() => {
                setButtonState({
                  ...buttonState,
                  thumbDownSelected: !buttonState.thumbDownSelected,
                  thumbUpSelected: false,
                });
              }}
            >
              <span className="material-icons-outlined icon">thumb_down</span>
            </button>
          </div>
          {(buttonState.thumbUpSelected || buttonState.thumbDownSelected) && (
            <div className="feedback-buttons-container">
              {buttonState.thumbUpSelected && (
                <>
                  <button
                    className={`feedback-button ${
                      buttonState.matchesMyQuerySelected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setButtonState({
                        ...buttonState,
                        matchesMyQuerySelected:
                          !buttonState.matchesMyQuerySelected,
                      });
                    }}
                  >
                    {buttonState.matchesMyQuerySelected && (
                      <span className="material-icons-outlined icon">
                        check
                      </span>
                    )}
                    Matches my query
                  </button>
                  <button
                    className={`feedback-button ${
                      buttonState.positiveOtherSelected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setButtonState({
                        ...buttonState,
                        positiveOtherSelected:
                          !buttonState.positiveOtherSelected,
                      });
                    }}
                  >
                    {buttonState.positiveOtherSelected && (
                      <span className="material-icons-outlined icon">
                        check
                      </span>
                    )}
                    Other
                  </button>
                </>
              )}
              {buttonState.thumbDownSelected && (
                <>
                  <button
                    className={`feedback-button ${
                      buttonState.doesNotMatchMyQuerySelected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setButtonState({
                        ...buttonState,
                        doesNotMatchMyQuerySelected:
                          !buttonState.doesNotMatchMyQuerySelected,
                      });
                    }}
                  >
                    {buttonState.doesNotMatchMyQuerySelected && (
                      <span className="material-icons-outlined icon">
                        check
                      </span>
                    )}
                    Doesn&apos;t match my query
                  </button>
                  <button
                    className={`feedback-button ${
                      buttonState.dataSeemsOffSelected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setButtonState({
                        ...buttonState,
                        dataSeemsOffSelected: !buttonState.dataSeemsOffSelected,
                      });
                    }}
                  >
                    {buttonState.dataSeemsOffSelected && (
                      <span className="material-icons-outlined icon">
                        check
                      </span>
                    )}
                    Data seems off
                  </button>
                  <button
                    className={`feedback-button ${
                      buttonState.negativeOtherSelected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setButtonState({
                        ...buttonState,
                        negativeOtherSelected:
                          !buttonState.negativeOtherSelected,
                      });
                    }}
                  >
                    {buttonState.negativeOtherSelected && (
                      <span className="material-icons-outlined icon">
                        check
                      </span>
                    )}
                    Other
                  </button>
                </>
              )}
            </div>
          )}
          <textarea
            className="modal-textarea"
            onChange={(event) => {
              setTextareaValue(event.target.value);
            }}
            placeholder="Enter your feedback here"
            rows={3}
          ></textarea>
        </div>
      </ModalBody>
      <ModalFooter>
        <IconButton label="Cancel" onClick={props.toggleCallback} />
        <IconButton
          label="Submit"
          onClick={() => {
            submitFeedback(
              buttonState,
              textareaValue,
              props.nlSessionId,
              props.chartId
            );
            props.toggleCallback();
          }}
          primary
        />
      </ModalFooter>
    </Modal>
  );
}

/**
 * Submit feedback to nl/feedback API endpoint
 * @param state which buttons have been selected
 * @param comment free-form comment left by the user
 * @param nlSessionId NL session ID user was in
 * @param chartId ID of the chart the feedback is about
 */
function submitFeedback(
  state: ButtonStateType,
  comment: string,
  nlSessionId: string,
  chartId: string
): void {
  const feedbackData = {
    categories: [],
    chartId: getNlChartId(chartId),
    comment,
  };

  if (state.thumbDownSelected) {
    feedbackData["sentiment"] = CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN;

    if (state.doesNotMatchMyQuerySelected) {
      feedbackData["categories"].push(CHART_FEEDBACK_SENTIMENT.NOT_MATCH_QUERY);
    }

    if (state.dataSeemsOffSelected) {
      feedbackData["categories"].push(CHART_FEEDBACK_SENTIMENT.DATA_OFF);
    }
  } else if (state.thumbUpSelected) {
    feedbackData["sentiment"] = CHART_FEEDBACK_SENTIMENT.THUMBS_UP;

    if (state.matchesMyQuerySelected) {
      feedbackData["categories"].push(CHART_FEEDBACK_SENTIMENT.MATCHES_QUERY);
    }
  }

  if (state.positiveOtherSelected || state.negativeOtherSelected) {
    feedbackData["categories"].push(CHART_FEEDBACK_SENTIMENT.OTHER);
  }

  axios.post("/api/explore/feedback", {
    feedbackData,
    sessionId: nlSessionId,
  });
}
