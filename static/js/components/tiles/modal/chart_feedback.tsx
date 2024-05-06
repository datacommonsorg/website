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
import React, { useCallback, useContext, useRef, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { intl } from "../../../i18n/i18n";
import { NlSessionContext } from "../../../shared/context";
import { randDomId } from "../../../shared/util";
import {
  CHART_FEEDBACK_SENTIMENT,
  getNlChartId,
} from "../../../utils/nl_interface_utils";
import { IconButton } from "../../form_components/icon_buttons";

interface ButtonStateType {
  thumbUpSelected: boolean;
  thumbDownSelected: boolean;
  matchesMyQuerySelected: boolean;
  doesNotMatchMyQuerySelected: boolean;
  dataSeemsOffSelected: boolean;
  positiveOtherSelected: boolean;
  negativeOtherSelected: boolean;
}

interface ChartFeedbackPropsType {
  // Id of the chart feedback is about
  chartId: string;
  container?: HTMLElement;
  // Whether modal is open or closed
  isOpen: boolean;
  nlSessionId: string;
  // function to run when modal is toggled open or closed
  toggleCallback: () => void;
}

export function ChartFeedback(props: ChartFeedbackPropsType): JSX.Element {
  const modalId = randDomId();
  const [textareaValue, setTextareaValue] = useState("");
  const [buttonState, setButtonState] = useState<ButtonStateType>({
    thumbUpSelected: false,
    thumbDownSelected: false,
    matchesMyQuerySelected: false,
    doesNotMatchMyQuerySelected: false,
    dataSeemsOffSelected: false,
    positiveOtherSelected: false,
    negativeOtherSelected: false,
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
          id: "embed_export_chart_link",
          defaultMessage: "Rating module",
          description:
            "Text for the hyperlink text that will let users rate and leave feedback about a chart.",
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
                  thumbUpSelected: !buttonState.thumbUpSelected,
                  thumbDownSelected: false,
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

function submitFeedback(
  state: ButtonStateType,
  comment: string,
  nlSessionId: string,
  chartId: string
): void {
  const feedbackData = {
    chartId: getNlChartId(chartId),
    comment,
  };

  if (state.thumbDownSelected) {
    feedbackData["sentiment"] = CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN;
    feedbackData["categories"] = [];

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

  axios.post("/api/nl/feedback", {
    feedbackData,
    sessionId: nlSessionId,
  });
}
