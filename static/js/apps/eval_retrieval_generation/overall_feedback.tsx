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

/* Component to record overall feedback for a query */

import React, { FormEvent, useContext, useEffect, useState } from "react";
import { Button } from "reactstrap";

import { loadSpinner, removeSpinner } from "../../shared/util";
import {
  FEEDBACK_FORM_ID,
  FEEDBACK_PANE_ID,
  OVERALL_QUESTIONS_OPTION_HAS_MISSING,
  OVERALL_QUESTIONS_OPTION_NONE_MISSING,
  QUERY_OVERALL_ANS_KEY,
  QUERY_OVERALL_FEEDBACK_COL,
  QUERY_OVERALL_OPTION_HALLUCINATION,
  QUERY_OVERALL_OPTION_IRRELEVANT,
  QUERY_OVERALL_OPTION_OK,
  QUERY_OVERALL_OPTION_RELEVANT,
  QUERY_OVERALL_OPTION_SOMEWHAT_RELEVANT,
  QUERY_OVERALL_QUESTIONS_KEY,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { getField, getPath, saveToSheet, setFields } from "./data_store";
import { EvalList } from "./eval_list";
import { FeedbackNavigation } from "./feedback_navigation";
import { OneQuestion } from "./one_question";
import { TablePane } from "./table_pane";
import { EvalType, FeedbackStage } from "./types";

// object to hold information about a question
interface QuestionConfig {
  title: string;
  question: string;
  responseOptions: Record<string, string>;
}

// Dictionary of feedback stage -> eval type -> question config
const QUESTION_CONFIG: Record<string, Record<string, QuestionConfig>> = {
  [FeedbackStage.OVERALL_QUESTIONS]: {
    [EvalType.RAG]: {
      title: "QUESTIONS EVALUATION",
      question:
        "Do the generated questions seem sufficient to answer the query?",
      responseOptions: {
        [OVERALL_QUESTIONS_OPTION_HAS_MISSING]: "Missing obvious questions",
        [OVERALL_QUESTIONS_OPTION_NONE_MISSING]: "No obvious questions missing",
      },
    },
  },
  [FeedbackStage.OVERALL_ANS]: {
    [EvalType.RIG]: {
      title: "OVERALL EVALUATION",
      question: "How is the overall answer?",
      responseOptions: {
        [QUERY_OVERALL_OPTION_HALLUCINATION]: "Found factual inaccuracies",
        [QUERY_OVERALL_OPTION_OK]: "No obvious factual inaccuracies",
      },
    },
    [EvalType.RAG]: {
      title: "OVERALL EVALUATION",
      question: "How relevant is the overall answer to the query?",
      responseOptions: {
        [QUERY_OVERALL_OPTION_IRRELEVANT]: "Not at all relevant",
        [QUERY_OVERALL_OPTION_SOMEWHAT_RELEVANT]: "Somewhat relevant",
        [QUERY_OVERALL_OPTION_RELEVANT]: "Relevant",
      },
    },
  },
};

// Get firestore key to use for this feedback stage
function getFirestoreKey(feedbackStage: FeedbackStage): string {
  if (feedbackStage === FeedbackStage.OVERALL_QUESTIONS) {
    return QUERY_OVERALL_QUESTIONS_KEY;
  } else {
    return QUERY_OVERALL_ANS_KEY;
  }
}

// Get sheets column to use for this feedback stage
function getSheetsCol(feedbackStage: FeedbackStage): string {
  if (feedbackStage === FeedbackStage.OVERALL_QUESTIONS) {
    return QUERY_OVERALL_QUESTIONS_KEY;
  } else {
    return QUERY_OVERALL_FEEDBACK_COL;
  }
}

export function OverallFeedback(): JSX.Element {
  const { doc, sheetId, userEmail, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId, feedbackStage } =
    useContext(SessionContext);
  const [response, setResponse] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(null);

  useEffect(() => {
    loadSpinner(FEEDBACK_PANE_ID);
    getField(getPath(sheetId, sessionQueryId), getFirestoreKey(feedbackStage))
      .then((data) => {
        if (data) {
          setResponse(data.toString());
          setIsSubmitted(true);
        } else {
          setResponse("");
          setIsSubmitted(false);
        }
      })
      .finally(() => removeSpinner(FEEDBACK_PANE_ID));
  }, [sheetId, sessionQueryId, sessionCallId, feedbackStage]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (isSubmitted) {
      return Promise.resolve(true);
    }
    loadSpinner(FEEDBACK_PANE_ID);
    return Promise.all([
      setFields(getPath(sheetId, sessionQueryId), {
        [getFirestoreKey(feedbackStage)]: response,
      }),
      saveToSheet(userEmail, doc, sessionQueryId, sessionCallId, {
        [getSheetsCol(feedbackStage)]: response,
      }),
    ])
      .then(() => {
        return true;
      })
      .catch((error) => {
        alert("Error submitting response: " + error);
        return false;
      })
      .finally(() => {
        removeSpinner(FEEDBACK_PANE_ID);
      });
  };

  const handleChange = (event: FormEvent<HTMLInputElement>) => {
    const { value } = event.target as HTMLInputElement;
    setResponse(value);
  };

  const enableReeval = () => {
    setResponse("");
    setIsSubmitted(false);
  };

  const questionConfig = QUESTION_CONFIG[feedbackStage][evalType];

  return (
    <>
      <div className="button-section">
        <Button className="reeval-button" onClick={enableReeval}>
          <div>
            <span className="material-icons-outlined">redo</span>
            Re-Eval
          </div>
        </Button>
        <EvalList />
      </div>
      <div id={FEEDBACK_FORM_ID}>
        <form>
          <fieldset>
            <div className="question-section">
              <div className="title">{questionConfig.title}</div>
              <OneQuestion
                question={questionConfig.question}
                name="overall"
                options={questionConfig.responseOptions}
                handleChange={handleChange}
                responseField={response}
                disabled={isSubmitted}
              />
            </div>
          </fieldset>
        </form>
      </div>
      {evalType === EvalType.RAG && <TablePane />}
      <FeedbackNavigation checkAndSubmit={checkAndSubmit} />
    </>
  );
}
