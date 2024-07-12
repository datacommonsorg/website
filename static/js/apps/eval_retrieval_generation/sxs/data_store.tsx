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

import { doc, DocumentReference, getDoc, setDoc } from "firebase/firestore";

import { db } from "../../../utils/firebase";
import { Rating, SxsPreference } from "./types";

/**
 * Gets the document ref for a particular rating.
 */
function getRatingRef(
  sheetIdA: string,
  sheetIdB: string,
  queryId: number,
  sessionId: string
): DocumentReference {
  // Use sheet IDs in lexicographical order so it doesn't matter which order
  // they're passed in.
  const firstSheetId = sheetIdA < sheetIdB ? sheetIdA : sheetIdB;
  const secondSheetId = sheetIdA < sheetIdB ? sheetIdB : sheetIdA;
  return doc(
    db,
    "sheets",
    `${firstSheetId}:${secondSheetId}`,
    "queries",
    queryId.toString(),
    "ratings",
    String(sessionId)
  );
}

/**
 * Checks if two ratings are the same.
 */
function areEqual(r1: Rating | null, r2: Rating | null): boolean {
  if (!r1 || !r2) {
    return r1 === r2;
  }
  return (
    r1.leftSheetId === r2.leftSheetId &&
    r1.preference === r2.preference &&
    r1.reason === r2.reason &&
    r1.rightSheetId === r2.rightSheetId
  );
}

/**
 * Saves a rater's input to Firestore only if it is different from any existing
 * stored rating. Overwrites any previous data.
 */
export async function saveRatingIfChanged(
  userEmail: string,
  sheetIdA: string,
  sheetIdB: string,
  queryId: number,
  sessionId: string,
  rating: Rating
) {
  const storedRating = await getStoredRating(
    sheetIdA,
    sheetIdB,
    queryId,
    sessionId
  );
  if (areEqual(rating, storedRating)) {
    // No change; skip saving.
    return Promise.resolve();
  }
  return saveRatingToStore(
    userEmail,
    sheetIdA,
    sheetIdB,
    queryId,
    sessionId,
    rating
  );
}

/**
 * Saves a rater's input to Firestore, overwriting any previous data.
 */
export async function saveRatingToStore(
  userEmail: string,
  sheetIdA: string,
  sheetIdB: string,
  queryId: number,
  sessionId: string,
  rating: Rating
): Promise<void> {
  const docRef = getRatingRef(sheetIdA, sheetIdB, queryId, sessionId);
  const dataToSave = { ...rating, userEmail, timestamp: new Date() };
  return setDoc(docRef, dataToSave);
}

/**
 * Gets any prior rating for the given query and session.
 */
export async function getStoredRating(
  sheetIdA: string,
  sheetIdB: string,
  queryId: number,
  sessionId: string
): Promise<Rating | null> {
  const docRef = getRatingRef(sheetIdA, sheetIdB, queryId, sessionId);
  const snapshot = await getDoc(docRef);
  const savedData = snapshot.data();
  if (!savedData) return null;
  return {
    leftSheetId: savedData["leftSheetId"],
    preference: savedData["preference"] as SxsPreference,
    reason: savedData["reason"],
    rightSheetId: savedData["rightSheetId"],
  };
}
