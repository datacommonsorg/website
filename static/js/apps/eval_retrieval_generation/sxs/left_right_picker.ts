import sdbm from "sdbm";

import { DocInfo } from "../types";

/**
 * Result is stable based on inputs.
 */
export function getLeftAndRight(
  sessionId: string,
  docInfoA: DocInfo | null,
  docInfoB: DocInfo | null,
  queryId: number
): { left: DocInfo; right: DocInfo } {
  if (!docInfoA || !docInfoB) {
    return { left: docInfoA, right: docInfoB };
  }
  const inputs =
    `${docInfoA.doc.spreadsheetId} ${docInfoB.doc.spreadsheetId}` +
    ` ${sessionId} ${queryId}`;
  if (sdbm(inputs) % 2 === 0) {
    return { left: docInfoA, right: docInfoB };
  } else {
    return { left: docInfoB, right: docInfoA };
  }
}
