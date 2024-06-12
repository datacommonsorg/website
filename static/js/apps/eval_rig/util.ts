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

const httpPattern = /https:\/\/[^\s]+/g;

export const processText = (text: string): string => {
  // If "Answer" is in the text, remove it
  let processedText = text.replace("Answer:", "");
  // If "FOOTNOTES" in all caps is in the text, convert it to lower case
  processedText = processedText.replace("FOOTNOTES", "Footnotes");
  processedText = processedText.replace(
    // Replace [__DC__#1(dc stat text||llm stat text)] to
    // dc stat text||llm stat text with html and css annotations.
    /\[\s*__DC__#(\d+)\((.*?)\)\]/g,
    (match, callId, content) => {
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
      innerHtml += `<span class="dc-stat">${dcStat || "&nbsp;&nbsp;"}</span>||`;
      innerHtml += `<span class="llm-stat">${llmStat || "&nbsp;&nbsp;"}</span>`;
      return `<span class="annotation annotation-${callId}">${innerHtml}</span>`;
    }
  );
  // Replace each link with the desired HTML format
  return processedText.replace(
    httpPattern,
    (match) => `<a href="${match}" target="_blank">Explore Page</a><br> `
  );
};
