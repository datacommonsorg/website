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

/* Component with buttons for navigating between queries. */

import _ from "lodash";
import React, { useContext } from "react";
import { Button } from "reactstrap";

import { AllQuery } from "../types";
import { SessionContext } from "./context";
import { EvalList } from "./eval_list";

enum ButtonType {
  PREV_QUERY = "PREV_QUERY",
  NEXT_QUERY = "NEXT_QUERY",
  FINISH = "FINISH",
  EMPTY = "EMPTY",
}

interface ButtonConfig {
  text: string;
  themeClassName: string;
}

// Map each button type to its config
const BUTTON_CONFIGS: Record<string, ButtonConfig> = {
  [ButtonType.PREV_QUERY]: {
    text: "Previous query",
    themeClassName: "btn-transparent",
  },
  [ButtonType.NEXT_QUERY]: {
    text: "Continue to next query",
    themeClassName: "btn-blue",
  },
  [ButtonType.FINISH]: {
    text: "Finish",
    themeClassName: "btn-blue",
  },
};

interface NavigationPropType {
  leftSheetId: string;
  rightSheetId: string;
  sessionId: string;
  sortedQueryIds: number[];
  allQuery: AllQuery;
  checkAndSubmit: () => Promise<boolean>;
}

export function Navigation(props: NavigationPropType): JSX.Element {
  const { sessionQueryId, setSessionQueryId } = useContext(SessionContext);
  const currentIdIndex = props.sortedQueryIds.indexOf(sessionQueryId);

  const atStart = currentIdIndex === 0;
  const atEnd = currentIdIndex === props.sortedQueryIds.length - 1;

  // Button Actions
  const prevQuery = async () => {
    if (await props.checkAndSubmit()) {
      setSessionQueryId(props.sortedQueryIds[currentIdIndex - 1]);
    }
  };

  const nextQuery = async () => {
    if (await props.checkAndSubmit()) {
      setSessionQueryId(props.sortedQueryIds[currentIdIndex + 1]);
    }
  };

  const finish = async () => {
    if (await props.checkAndSubmit()) {
      alert("All evaluations completed.");
    }
  };

  // Button Conditions
  function getNextButtonType(): ButtonType {
    return atEnd ? ButtonType.FINISH : ButtonType.NEXT_QUERY;
  }

  function getPrevButtonType(): ButtonType {
    return atStart ? ButtonType.EMPTY : ButtonType.PREV_QUERY;
  }

  function getOnClickFunction(buttonType: ButtonType): () => void {
    switch (buttonType) {
      case ButtonType.PREV_QUERY:
        return prevQuery;
      case ButtonType.NEXT_QUERY:
        return nextQuery;
      case ButtonType.FINISH:
        return finish;
      default:
        return _.noop;
    }
  }
  const prevButtonType = getPrevButtonType();
  const nextButtonType = getNextButtonType();

  return (
    <div className="feedback-nav-section">
      <EvalList
        leftSheetId={props.leftSheetId}
        rightSheetId={props.rightSheetId}
        sessionId={props.sessionId}
        sortedQueryIds={props.sortedQueryIds}
        allQuery={props.allQuery}
      ></EvalList>
      <div className="nav-buttons">
        {prevButtonType !== ButtonType.EMPTY && (
          <Button
            onClick={getOnClickFunction(prevButtonType)}
            className={BUTTON_CONFIGS[prevButtonType].themeClassName}
          >
            <div>{BUTTON_CONFIGS[prevButtonType].text}</div>
          </Button>
        )}
        {nextButtonType !== ButtonType.EMPTY && (
          <Button
            onClick={getOnClickFunction(nextButtonType)}
            className={BUTTON_CONFIGS[nextButtonType].themeClassName}
          >
            <div>{BUTTON_CONFIGS[nextButtonType].text}</div>
          </Button>
        )}
      </div>
    </div>
  );
}
