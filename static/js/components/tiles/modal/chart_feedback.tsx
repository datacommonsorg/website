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
import { Category } from "../../subject_page/category";

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
  // Whether modal is open or closed
  isOpen: boolean;
  // function to run when modal is toggled open or closed
  toggleCallback: () => void;
}

export function ChartFeedback(props: ChartFeedbackPropsType): JSX.Element {
  const modalId = randDomId();
  const nlSessionId = useContext(NlSessionContext);
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

  return (
    <Modal
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
              nlSessionId,
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

// import axios from "axios";
// import React, { useCallback, useContext, useState } from "react";
// import { UncontrolledTooltip } from "reactstrap";

// import { NlSessionContext } from "../shared/context";
// import {
//   CHART_FEEDBACK_SENTIMENT,
//   getNlChartId,
// } from "../utils/nl_interface_utils";

// class Option {
//   icon: string;
//   sentiment: string;
//   tooltip: string;
// }

// const FEEDBACK_OPTIONS: Option[] = [
//   {
//     icon: "thumb_up",
//     sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_UP,
//     tooltip: "The chart is relevant for the query",
//   },
//   {
//     icon: "thumb_down",
//     sentiment: CHART_FEEDBACK_SENTIMENT.THUMBS_DOWN,
//     tooltip: "The chart is not relevant for the query",
//   },
//   {
//     icon: "move_up",
//     sentiment: CHART_FEEDBACK_SENTIMENT.PROMOTE,
//     tooltip: "The chart should be promoted up",
//   },
//   {
//     icon: "move_down",
//     sentiment: CHART_FEEDBACK_SENTIMENT.DEMOTE,
//     tooltip: "The chart should be demoted",
//   },
//   {
//     icon: "priority_high",
//     sentiment: CHART_FEEDBACK_SENTIMENT.FACE_PALM,
//     tooltip: "The chart is embarrassing or inappropriate for the query",
//   },
// ];

// interface EmojiPropType {
//   id: string;
//   option: Option;
//   saved: boolean;
//   action: (sentiment: string, comment: string) => void;
// }

// function Emoji(props: EmojiPropType): JSX.Element {
//   const [isPopUpVisible, setPopUpVisible] = useState(false);
//   const [textInput, setTextInput] = useState("");

//   const handleElementClick = () => {
//     if (props.saved) {
//       return;
//     }
//     setPopUpVisible(true);
//   };

//   const handlePopUpClose = () => {
//     setPopUpVisible(false);
//   };

//   const handleInputChange = (event) => {
//     setTextInput(event.target.value);
//   };

//   const handleSubmit = () => {
//     // Do something with the submitted text, for example, send it to a server.
//     props.action(props.option.sentiment, textInput);
//     // Close the pop-up after submission
//     setPopUpVisible(false);
//   };

//   return (
//     <>
//       <div>
//         <span
//           className={`material-icons-outlined feedback-emoji ${
//             props.saved ? "feedback-emoji-dim" : ""
//           }`}
//           id={`${props.id}-${props.option.sentiment}`}
//           onClick={() => handleElementClick()}
//         >
//           {props.option.icon}
//         </span>
//         {!props.saved && (
//           <UncontrolledTooltip
//             boundariesElement="window"
//             delay={200}
//             placement="top"
//             target={`${props.id}-${props.option.sentiment}`}
//           >
//             {props.option.tooltip}
//           </UncontrolledTooltip>
//         )}
//       </div>
//       {isPopUpVisible && (
//         <>
//           <div className="popup-box">
//             <textarea
//               value={textInput}
//               onChange={handleInputChange}
//               placeholder="Enter your feedback here"
//               rows={5}
//               cols={30}
//             />
//             <button onClick={handleSubmit}>Submit</button>
//             <button onClick={handlePopUpClose}>Close</button>
//           </div>
//         </>
//       )}
//     </>
//   );
// }

// interface NlChartFeedbackPropType {
//   // This is a fixed ID format string
//   // e.g., "pg0_cat_1_blk_2_col_3_tile_4"
//   id: string;
// }

// export function NlChartFeedback(props: NlChartFeedbackPropType): JSX.Element {
//   const nlSessionId = useContext(NlSessionContext);
//   const [saved, setSaved] = useState(false);

//   const saveFeedback = useCallback(
//     (sentiment: string, comment: string) => {
//       if (saved) {
//         return;
//       }
//       setSaved(true);
//       axios.post("/api/nl/feedback", {
//         feedbackData: {
//           chartId: getNlChartId(props.id),
//           comment,
//           sentiment,
//         },
//         sessionId: nlSessionId,
//       });
//     },
//     [nlSessionId, saved, props.id]
//   );

//   if (!nlSessionId) {
//     return null;
//   }
//   return (
//     <div className="nl-feedback">
//       <span className="nl-feedback-text">
//         {saved ? <>Feedback saved</> : null}
//       </span>
//       <div className="nl-feedback-actions">
//         {FEEDBACK_OPTIONS.map((option, i) => (
//           <Emoji
//             key={i}
//             id={props.id}
//             option={option}
//             saved={saved}
//             action={saveFeedback}
//           ></Emoji>
//         ))}
//       </div>
//     </div>
//   );
// }
