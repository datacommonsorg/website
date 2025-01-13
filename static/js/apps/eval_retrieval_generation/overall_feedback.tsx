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

import { loadSpinner, removeSpinner } from "../../shared/util";
import {
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
import { getAllFields, getPath, saveToSheet, setFields } from "./data_store";
import { FeedbackWrapper } from "./feedback_wrapper";
import { OneQuestion } from "./one_question";
import { EvalType, FeedbackStage } from "./types";

// object to hold information about a question
interface QuestionConfig {
  title: string;
  questions: {
    firestoreKey: string;
    question: string;
    responseOptions: Record<string, string>;
  }[];
}

// Dictionary of feedback stage -> eval type -> question config
const QUESTION_CONFIG: Record<string, Record<string, QuestionConfig>> = {
  [FeedbackStage.OVERALL_QUESTIONS]: {
    [EvalType.RAG]: {
      questions: [
        {
          firestoreKey: QUERY_OVERALL_QUESTIONS_KEY,
          question:
            "Do the generated questions seem sufficient to answer the query?",
          responseOptions: {
            [OVERALL_QUESTIONS_OPTION_HAS_MISSING]: "Missing obvious questions",
            [OVERALL_QUESTIONS_OPTION_NONE_MISSING]:
              "No obvious questions missing",
          },
        },
      ],
      title: "QUESTIONS EVALUATION",
    },
  },
  [FeedbackStage.OVERALL_ANS]: {
    [EvalType.RIG]: {
      questions: [
        {
          firestoreKey: QUERY_OVERALL_ANS_KEY,
          question: "How is the overall answer?",
          responseOptions: {
            [QUERY_OVERALL_OPTION_HALLUCINATION]: "Found factual inaccuracies",
            [QUERY_OVERALL_OPTION_OK]: "No obvious factual inaccuracies",
          },
        },
      ],
      title: "OVERALL EVALUATION",
    },
    [EvalType.RAG]: {
      questions: [
        {
          firestoreKey: QUERY_OVERALL_ANS_KEY,
          question: "How well does the LLM answer the user query??",
          responseOptions: {
            [QUERY_OVERALL_OPTION_IRRELEVANT]: "Does not answer the query",
            [QUERY_OVERALL_OPTION_SOMEWHAT_RELEVANT]:
              "Partially answers the query",
            [QUERY_OVERALL_OPTION_RELEVANT]: "Fully answers the query",
          },
        },
      ],
      title: "OVERALL EVALUATION",
    },
  },
};

// Get sheets column to use for a given firestore key
function getSheetsCol(evalType: EvalType, firestoreKey: string): string {
  // Only for RIG eval, the sheets column is different from the firestore key
  if (evalType === EvalType.RIG && firestoreKey === QUERY_OVERALL_ANS_KEY) {
    return QUERY_OVERALL_FEEDBACK_COL;
  }
  return firestoreKey;
}

// Gets an empty response object
function getEmptyResponse(
  evalType: EvalType,
  feedbackStage: FeedbackStage
): Record<string, string> {
  const emptyResponse = {};
  const questionConfigs = QUESTION_CONFIG[feedbackStage][evalType].questions;
  questionConfigs.forEach((config) => {
    emptyResponse[config.firestoreKey] = "";
  });
  return emptyResponse;
}

export function OverallFeedback(): JSX.Element {
  const { doc, sheetId, userEmail, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId, feedbackStage } =
    useContext(SessionContext);
  // the key is the firestoreKey for the question and value is the response
  const [response, setResponse] = useState<Record<string, string>>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(null);

  useEffect(() => {
    loadSpinner(FEEDBACK_PANE_ID);
    let subscribed = true;
    getAllFields(getPath(sheetId, sessionQueryId))
      .then((data) => {
        if (!subscribed) return;
        const newResponse = getEmptyResponse(evalType, feedbackStage);
        let newIsSubmitted = true;
        Object.keys(newResponse).forEach((key) => {
          if (!(key in data)) {
            newIsSubmitted = false;
            return;
          }
          newResponse[key] = data[key];
        });
        setResponse(newResponse);
        setIsSubmitted(newIsSubmitted);
      })
      .finally(() => removeSpinner(FEEDBACK_PANE_ID));
    return () => void (subscribed = false);
  }, [sheetId, sessionQueryId, sessionCallId, feedbackStage, evalType]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (isSubmitted) {
      return Promise.resolve(true);
    }
    const numEmptyResponses = Object.values(response).filter(
      (val) => val === ""
    ).length;
    if (numEmptyResponses > 0) {
      // If there are some empty responses and some answered, alert user to fill
      // out all fields
      if (numEmptyResponses < Object.keys(response).length) {
        alert("Please fill in all fields");
        return Promise.resolve(false);
      }
      // If all responses are empty, allow user to move on, but don't save the
      // answer.
      return Promise.resolve(true);
    }
    loadSpinner(FEEDBACK_PANE_ID);
    const sheetsResponse = {};
    Object.keys(response).forEach((responseKey) => {
      sheetsResponse[getSheetsCol(evalType, responseKey)] =
        response[responseKey];
    });
    return Promise.all([
      setFields(getPath(sheetId, sessionQueryId), response),
      saveToSheet(
        userEmail,
        doc,
        sessionQueryId,
        sessionCallId,
        sheetsResponse
      ),
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

  const handleChange = (event: FormEvent<HTMLInputElement>): void => {
    const { name, value } = event.target as HTMLInputElement;
    setResponse((prevState) => {
      return { ...prevState, [name]: value };
    });
  };

  const enableReeval = (): void => {
    setResponse(getEmptyResponse(evalType, feedbackStage));
    setIsSubmitted(false);
  };

  if (response === null) {
    return null;
  }

  const questionConfig = QUESTION_CONFIG[feedbackStage][evalType];

  return (
    <FeedbackWrapper onReEval={enableReeval} checkAndSubmit={checkAndSubmit}>
      <form>
        <fieldset>
          <div className="question-section">
            <div className="title">{questionConfig.title}</div>
            {questionConfig.questions.map((question) => {
              return (
                <OneQuestion
                  key={question.firestoreKey}
                  question={question.question}
                  name={question.firestoreKey}
                  options={question.responseOptions}
                  handleChange={handleChange}
                  responseField={response[question.firestoreKey]}
                  disabled={isSubmitted}
                />
              );
            })}
          </div>
        </fieldset>
      </form>
    </FeedbackWrapper>
  );
}
