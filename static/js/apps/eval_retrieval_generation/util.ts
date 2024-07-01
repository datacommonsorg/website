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

import _ from "lodash";

import { FEEDBACK_STAGE_LIST } from "./constants";
import { EvalType, FeedbackStage } from "./types";

const HTTP_PATTERN = /https:\/\/[^\s]+/g;
const LONG_SPACES = "&nbsp;&nbsp;&nbsp;&nbsp;";
const TABLE_DIVIDER_PATTERN = /[--][-]+/g;
// table headers are sometimes country names so there can be symbols used like
// in "Côte d'Ivoire".
const TABLE_HEADER_TEXT_PATTERN = /[\w'ô[\]ãéí\s°()%:-\\,\\₂]+/g;

export const processText = (text: string): string => {
  if (!text) {
    return "";
  }
  // If "Answer" is in the text, remove it
  let processedText = text.replace("Answer:", "");
  // If "FOOTNOTES" in all caps is in the text, convert it to lower case
  processedText = processedText.replace("FOOTNOTES", "Footnotes");
  processedText = processedText.replace(
    // Replace [__DC__#1(dc stat text||llm stat text)] to
    // dc stat text||llm stat text with html and css annotations.
    /\[\s*__DC__#(\d+)\((.*?)\)\]/g,
    (_, callId, content) => {
      // Split the second capturing group by "||"
      const parts = content.split("||");
      let dcStat: string;
      let llmStat: string;
      if (parts.length === 2) {
        dcStat = parts[0];
        llmStat = parts[1];
      } else {
        llmStat = parts[0];
      }
      let innerHtml = "";
      innerHtml += `<span class="dc-stat">${dcStat || LONG_SPACES}</span>`;
      innerHtml += `<span class="llm-stat">${llmStat || LONG_SPACES}</span>`;
      return `<span class="annotation annotation-${callId}">${innerHtml}</span>`;
    }
  );
  // Replace each link with the desired HTML format
  return processedText.replace(
    HTTP_PATTERN,
    (match) => `<a href="${match}" target="_blank">Explore Page</a><br> `
  );
};

export function processTableText(text: string): string {
  if (!text) {
    return "";
  }
  // Get a copy of the table header
  const tableHeader = _.cloneDeep(text).split("\n", 1)[0];
  // Replace all the text in the header with "-" to create the table divider
  // example: abc | cd -> -|-
  const tableDivider = tableHeader.replace(TABLE_HEADER_TEXT_PATTERN, "-");
  // Replace the table divider that's originally in the text with the one just
  // created
  return text.replace(TABLE_DIVIDER_PATTERN, tableDivider);
}

// Get the first feedback stage to show for an eval type
export function getFirstFeedbackStage(evalType: EvalType): FeedbackStage {
  return FEEDBACK_STAGE_LIST[evalType][0];
}
