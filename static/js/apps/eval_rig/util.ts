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

/**
 * Replace [__DC__#(id)(text)] to just text with css class for highlighting.
 * @param text
 * @returns
 */
export const processText = (text: string): string => {
  return text.replace(
    /\[\s*__DC__#(\d+)\(((?:[^)(]+|\([^)]*\))*)\)\s*\]/g,
    (match, p1, p2) => {
      // Split the second capturing group by "||"
      const parts = p2.split("||");
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
      return `<span class="annotation annotation-${p1}">${innerHtml}</span>`;
    }
  );
};
