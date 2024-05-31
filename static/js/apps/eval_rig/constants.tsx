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

export const QA_SHEET = "query_and_answer";
export const DC_CALL_SHEET = "dc_calls";
export const DC_FEEDBACK_SHEET = "feedback";

export const QUERY_ID_COL = "query_id";
export const USER_COL = "user";
export const QUERY_COL = "query";
export const ANSWER_COL = "answer";

export const CALL_ID_COL = "call_id";
export const DC_QUESTION_COL = "dc_question";
export const DC_RESPONSE_COL = "dc_response";
export const LLM_STAT_COL = "llm_stat";
export const DC_STAT_COL = "dc_stat";

const FB_SUFFIX = "_feedback";

export const DC_QUESTION_FEEDBACK_COL = DC_QUESTION_COL + FB_SUFFIX;
export const DC_RESPONSE_FEEDBACK_COL = DC_RESPONSE_COL + FB_SUFFIX;
export const LLM_STAT_FEEDBACK_COL = LLM_STAT_COL + FB_SUFFIX;
export const DC_STAT_FEEDBACK_COL = DC_STAT_COL + FB_SUFFIX;
