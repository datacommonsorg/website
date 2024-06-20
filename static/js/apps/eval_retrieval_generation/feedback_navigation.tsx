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

/* Component with buttons for navigating the feedback pages */

import _ from "lodash";
import React, { useContext } from "react";
import { Button } from "reactstrap";

import { NEW_QUERY_CALL_ID } from "./constants";
import { AppContext, SessionContext } from "./context";
import { EvalType, FeedbackStage } from "./types";
import { getFirstFeedbackStage } from "./util";

const FEEDBACK_STAGE_LIST: Record<EvalType, FeedbackStage[]> = {
  [EvalType.RIG]: [FeedbackStage.OVERALL, FeedbackStage.CALLS],
  // TODO: add RAG_ANS feedback stage
  [EvalType.RAG]: [FeedbackStage.CALLS, FeedbackStage.OVERALL],
};

enum ButtonType {
  PREV_QUERY = "PREV_QUERY",
  PREV = "PREV",
  PREV_EVAL_STAGE = "PREV_EVAL_STAGE",
  NEXT_QUERY = "NEXT_QUERY",
  NEXT = "NEXT",
  NEXT_EVAL_STAGE = "NEXT_EVAL_STAGE",
  FINISH = "FINISH",
  EMPTY = "EMPTY",
}

interface ButtonConfig {
  text: string;
  themeClassName: string;
  icon?: string;
}

// button type to its config
const BUTTON_CONFIGS: Record<string, ButtonConfig> = {
  [ButtonType.PREV_QUERY]: {
    text: "Previous query",
    themeClassName: "btn-transparent",
  },
  [ButtonType.PREV]: {
    icon: "keyboard_arrow_left",
    text: "Previous",
    themeClassName: "btn-transparent",
  },
  [ButtonType.PREV_EVAL_STAGE]: {
    text: "Previous eval stage",
    themeClassName: "btn-transparent",
  },
  [ButtonType.NEXT_QUERY]: {
    text: "Continue to next query",
    themeClassName: "btn-blue",
  },
  [ButtonType.NEXT]: {
    icon: "keyboard_arrow_right",
    text: "Next",
    themeClassName: "btn-blue",
  },
  [ButtonType.NEXT_EVAL_STAGE]: {
    text: "Next eval stage",
    themeClassName: "btn-blue",
  },
  [ButtonType.FINISH]: {
    text: "Finish",
    themeClassName: "btn-blue",
  },
};

// Whether or not we are at the last page of a feedback stage
function isEndOfStage(
  feedbackStage: FeedbackStage,
  sessionCallId: number,
  numCalls: number
): boolean {
  if (feedbackStage === FeedbackStage.CALLS) {
    return sessionCallId === numCalls;
  }
  // feedback stages besides CALLS only have one page
  return true;
}

// Whether or not we are at the first page of a feedback stage
function isStartOfStage(
  feedbackStage: FeedbackStage,
  sessionCallId: number
): boolean {
  if (feedbackStage === FeedbackStage.CALLS) {
    return sessionCallId === NEW_QUERY_CALL_ID;
  }
  // feedback stages besides CALLS only have one page
  return true;
}

// Whether or not to include a stage in the list of stages to show
function shouldIncludeStage(
  feedbackStage: FeedbackStage,
  numCalls: number
): boolean {
  if (feedbackStage === FeedbackStage.CALLS) {
    return numCalls > 0;
  }
  return true;
}

interface FeedbackNavigationPropType {
  checkAndSubmit: () => Promise<boolean>;
}

export function FeedbackNavigation(
  props: FeedbackNavigationPropType
): JSX.Element {
  const { allQuery, allCall, userEmail, evalType } = useContext(AppContext);
  const {
    sessionQueryId,
    setSessionQueryId,
    sessionCallId,
    setSessionCallId,
    feedbackStage,
    setFeedbackStage,
  } = useContext(SessionContext);

  const userQuery = Object.keys(allQuery)
    .filter(
      (qId) => allQuery[qId].user === userEmail || allQuery[qId].user === null
    )
    .reduce((obj, qId) => {
      obj[qId] = allQuery[qId];
      return obj;
    }, {});

  const sortedQueryIds = Object.keys(userQuery)
    .map((qKey) => Number(qKey))
    .sort((a, b) => a - b);

  const numCalls = Object.keys(allCall[sessionQueryId] || {}).length;
  const feedbackStageList = FEEDBACK_STAGE_LIST[evalType].filter((stage) =>
    shouldIncludeStage(stage, numCalls)
  );
  const currStageIdx = feedbackStageList.indexOf(feedbackStage);

  // Button Actions
  const prevQuery = async () => {
    if (await props.checkAndSubmit()) {
      let targetId = sessionQueryId - 1;
      while (!(targetId in userQuery)) {
        targetId -= 1;
      }
      setSessionQueryId(targetId);
      setFeedbackStage(getFirstFeedbackStage(evalType));
      setSessionCallId(NEW_QUERY_CALL_ID);
    }
  };

  const prev = async () => {
    if (await props.checkAndSubmit()) {
      if (feedbackStage === FeedbackStage.CALLS) {
        setSessionCallId(sessionCallId - 1);
      }
    }
  };

  const prevEvalStage = async () => {
    if (await props.checkAndSubmit()) {
      setFeedbackStage(feedbackStageList[currStageIdx - 1]);
    }
  };

  const next = async () => {
    if (await props.checkAndSubmit()) {
      if (feedbackStage === FeedbackStage.CALLS) {
        setSessionCallId(sessionCallId + 1);
      }
    }
  };

  const nextQuery = async () => {
    if (await props.checkAndSubmit()) {
      let targetId = sessionQueryId + 1;
      while (!(targetId in userQuery)) {
        targetId += 1;
      }
      setSessionQueryId(targetId);
      setFeedbackStage(getFirstFeedbackStage(evalType));
      setSessionCallId(NEW_QUERY_CALL_ID);
    }
  };

  const nextEvalStage = async () => {
    if (await props.checkAndSubmit()) {
      setFeedbackStage(feedbackStageList[currStageIdx + 1]);
      setSessionCallId(NEW_QUERY_CALL_ID);
    }
  };

  // Button Conditions

  function getNextButtonType(): ButtonType {
    if (isEndOfStage(feedbackStage, sessionCallId, numCalls)) {
      if (currStageIdx < feedbackStageList.length - 1) {
        return ButtonType.NEXT_EVAL_STAGE;
      }
      const hasMoreQueries =
        !_.isEmpty(sortedQueryIds) &&
        sessionQueryId < sortedQueryIds[sortedQueryIds.length - 1];
      return hasMoreQueries ? ButtonType.NEXT_QUERY : ButtonType.FINISH;
    } else {
      return ButtonType.NEXT;
    }
  }

  function getPrevButtonType(): ButtonType {
    if (isStartOfStage(feedbackStage, sessionCallId)) {
      if (currStageIdx > 0) {
        return ButtonType.PREV_EVAL_STAGE;
      }
      const hasPrevQuery =
        !_.isEmpty(sortedQueryIds) && sessionQueryId > sortedQueryIds[0];
      return hasPrevQuery ? ButtonType.PREV_QUERY : ButtonType.EMPTY;
    } else {
      return ButtonType.PREV;
    }
  }

  function getOnClickFunction(buttonType: ButtonType): () => void {
    switch (buttonType) {
      case ButtonType.PREV_QUERY:
        return prevQuery;
      case ButtonType.PREV:
        return prev;
      case ButtonType.PREV_EVAL_STAGE:
        return prevEvalStage;
      case ButtonType.NEXT_QUERY:
        return nextQuery;
      case ButtonType.NEXT:
        return next;
      case ButtonType.NEXT_EVAL_STAGE:
        return nextEvalStage;
      case ButtonType.FINISH:
        return props.checkAndSubmit;
      default:
        return _.noop;
    }
  }
  const prevButtonType = getPrevButtonType();
  const nextButtonType = getNextButtonType();

  return (
    <div className="feedback-nav-section">
      {feedbackStage === FeedbackStage.CALLS && (
        <div className="item-num">
          <span className="highlight">{sessionCallId}</span>
          <span className="regular">/ {numCalls} ITEMS IN THIS QUERY</span>
        </div>
      )}
      <div className="nav-buttons">
        {prevButtonType !== ButtonType.EMPTY && (
          <Button
            onClick={getOnClickFunction(prevButtonType)}
            className={BUTTON_CONFIGS[prevButtonType].themeClassName}
          >
            <div>
              {BUTTON_CONFIGS[prevButtonType].icon && (
                <span className="material-icons-outlined">
                  {BUTTON_CONFIGS[prevButtonType].icon}
                </span>
              )}
              {BUTTON_CONFIGS[prevButtonType].text}
            </div>
          </Button>
        )}
        {nextButtonType !== ButtonType.EMPTY && (
          <Button
            onClick={getOnClickFunction(nextButtonType)}
            className={BUTTON_CONFIGS[nextButtonType].themeClassName}
          >
            <div>
              {BUTTON_CONFIGS[nextButtonType].icon && (
                <span className="material-icons-outlined">
                  {BUTTON_CONFIGS[nextButtonType].icon}
                </span>
              )}
              {BUTTON_CONFIGS[nextButtonType].text}
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}
