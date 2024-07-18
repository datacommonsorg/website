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

import {
  collectionGroup,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../utils/firebase";
import { Rating, SxsPreference } from "./types";

const SHEETS_COLLECTION_NAME = "sheets";
const QUERIES_COLLECTION_NAME = "queries";
const RATINGS_COLLECTION_NAME = "ratings";

const SHEET_IDS_KEY = "sheetIds";
const SESSION_ID_KEY = "sessionId";

interface StorageOnlyRatingFields {
  [SHEET_IDS_KEY]: string;
  [SESSION_ID_KEY]: string;
  queryId: number;
  userEmail: string;
  timestamp: Date;
}

type StoredRating = Rating & StorageOnlyRatingFields;

/**
 * Gets the document ref for a particular rating.
 */
function getRatingRef(
  sheetIdA: string,
  sheetIdB: string,
  queryId: number,
  sessionId: string
): DocumentReference {
  return doc(
    db,
    SHEETS_COLLECTION_NAME,
    getCombinedSheetIds(sheetIdA, sheetIdB),
    QUERIES_COLLECTION_NAME,
    queryId.toString(),
    RATINGS_COLLECTION_NAME,
    String(sessionId)
  );
}

/**
 * Combines two sheet IDs into the expected format for Firestore path.
 */
function getCombinedSheetIds(sheetIdA: string, sheetIdB: string): string {
  // Use sheet IDs in lexicographical order so it doesn't matter which order
  // they're passed in.
  const firstSheetId = sheetIdA < sheetIdB ? sheetIdA : sheetIdB;
  const secondSheetId = sheetIdA < sheetIdB ? sheetIdB : sheetIdA;
  return `${firstSheetId}:${secondSheetId}`;
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
  const dataToSave: StoredRating = {
    ...rating,
    sheetIds: getCombinedSheetIds(sheetIdA, sheetIdB),
    sessionId,
    queryId,
    userEmail,
    timestamp: new Date(),
  };
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

/**
 * Gets the IDs of queries that have a stored rating under the given session ID.
 */
export async function getRatedQueryIds(
  sheetIdA: string,
  sheetIdB: string,
  sessionId: string
): Promise<number[]> {
  const sessionRatingsRef = query(
    collectionGroup(db, RATINGS_COLLECTION_NAME),
    where(SHEET_IDS_KEY, "==", getCombinedSheetIds(sheetIdA, sheetIdB)),
    where(SESSION_ID_KEY, "==", sessionId)
  );
  const sessionRatings = await getDocs(sessionRatingsRef);
  return sessionRatings.docs.map((ratingDocData) => {
    const storedRating = ratingDocData.data() as StoredRating;
    return storedRating.queryId;
  });
}
