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
  // TODO: Pseudo-randomize based on session ID, query ID, and two sheet IDs.
  if (Number(sessionId) % 2 == 0) {
    return { left: docInfoA, right: docInfoB };
  } else {
    return { left: docInfoB, right: docInfoA };
  }
}
