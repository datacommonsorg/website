/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import sdbm from "sdbm";

import { DocInfo } from "../types";

/**
 * Decides which docInfo to show on the left vs right side based on the combined
 * session ID, sheet IDs, and query ID. If all these values are the same,
 * the same decision will be made.
 */
export function getLeftAndRight(
  sessionId: string,
  docInfoA: DocInfo | null,
  docInfoB: DocInfo | null,
  queryId: number
): { leftDocInfo: DocInfo; rightDocInfo: DocInfo } {
  if (!docInfoA || !docInfoB) {
    return { leftDocInfo: docInfoA, rightDocInfo: docInfoB };
  }
  const inputs =
    `${docInfoA.doc.spreadsheetId} ${docInfoB.doc.spreadsheetId}` +
    ` ${sessionId} ${queryId}`;
  if (sdbm(inputs) % 2 === 0) {
    return { leftDocInfo: docInfoA, rightDocInfo: docInfoB };
  } else {
    return { leftDocInfo: docInfoB, rightDocInfo: docInfoA };
  }
}
