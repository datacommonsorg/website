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

import { EvalType, FeedbackStage } from "./types";

// TODO: think about cleaning up all these constants

export const QA_SHEET = "query_and_answer";
export const DC_CALL_SHEET = "dc_calls";
export const DC_FEEDBACK_SHEET = "feedback";
export const DC_METADATA_SHEET = "metadata";

export const QUERY_ID_COL = "query_id";
export const USER_COL = "user";
export const QUERY_COL = "query";
export const ANSWER_COL = "answer";

export const CALL_ID_COL = "call_id";
export const DC_QUESTION_COL = "dc_question";
export const DC_RESPONSE_COL = "dc_response";
export const LLM_STAT_COL = "llm_stat";
export const DC_STAT_COL = "dc_stat";

export const METADATA_KEY_COL = "metadata_key";
export const METADATA_VAL_COL = "metadata_value";
export const METADATA_KEY_TYPE = "type";

const FB_SUFFIX = "_feedback";

export const DC_QUESTION_FEEDBACK_COL = DC_QUESTION_COL + FB_SUFFIX;
export const DC_RESPONSE_FEEDBACK_COL = DC_RESPONSE_COL + FB_SUFFIX;
export const LLM_STAT_FEEDBACK_COL = LLM_STAT_COL + FB_SUFFIX;
export const DC_STAT_FEEDBACK_COL = DC_STAT_COL + FB_SUFFIX;
export const QUERY_OVERALL_FEEDBACK_COL = "overall" + FB_SUFFIX;

// Call Id to use for a new query
export const NEW_QUERY_CALL_ID = 1;
// The key used in firestore to save the query overall feedback
export const QUERY_OVERALL_ANS_KEY = "overall";
// The key used in firestore to save the query overall questions feedback
export const QUERY_OVERALL_QUESTIONS_KEY = "overallQuestions";
// Firestore keys used to save claims feedback
export const RAG_CLAIM_KEYS = {
  // total stat claims
  QUERY_TOTAL_STAT_CLAIMS_KEY: "totalStatClaims",
  // false stat claims
  QUERY_FALSE_STAT_CLAIMS_KEY: "falseStatClaims",
  // total inferred claims
  QUERY_TOTAL_INF_CLAIMS_KEY: "totalInferredClaims",
  // false inferred claims
  QUERY_FALSE_INF_CLAIMS_KEY: "falseInferredClaims",
  // unsubstantiated inferred claims
  QUERY_UNSUB_INF_CLAIMS_KEY: "unsubInferredClaims",
  // total tables used in claims
  QUERY_TABLES_USED_KEY: "tablesUsed",
};
// Options for the query overall feedback
export const QUERY_OVERALL_OPTION_HALLUCINATION = "LLM_ANSWER_HALLUCINATION";
export const QUERY_OVERALL_OPTION_OK = "LLM_ANSWER_OKAY";
export const QUERY_OVERALL_OPTION_IRRELEVANT = "LLM_ANSWER_IRRELEVANT";
export const QUERY_OVERALL_OPTION_SOMEWHAT_RELEVANT =
  "LLM_ANSWER_SOMEWHAT_RELEVANT";
export const QUERY_OVERALL_OPTION_RELEVANT = "LLM_ANSWER_RELEVANT";
// Options for the query calls overall feedback
export const OVERALL_QUESTIONS_OPTION_HAS_MISSING = "LLM_QUESTIONS_MISSING";
export const OVERALL_QUESTIONS_OPTION_NONE_MISSING =
  "LLM_QUESTIONS_NONE_MISSING";

export const FEEDBACK_STAGE_LIST: Record<EvalType, FeedbackStage[]> = {
  [EvalType.RIG]: [FeedbackStage.OVERALL_ANS, FeedbackStage.CALLS],
  [EvalType.RAG]: [
    FeedbackStage.OVERALL_QUESTIONS,
    FeedbackStage.CALLS,
    FeedbackStage.OVERALL_ANS,
    FeedbackStage.RAG_ANS,
  ],
  [EvalType.BASELINE]: [
    // Only used for SXS eval which does not have stages.
  ],
};

export const FEEDBACK_PANE_ID = "feedback-pane-container";
