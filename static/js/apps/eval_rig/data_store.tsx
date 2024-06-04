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

import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getCountFromServer,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { GoogleSpreadsheet } from "google-spreadsheet";

import { db } from "../../utils/firebase";
import {
  CALL_ID_COL,
  DC_FEEDBACK_SHEET,
  DC_QUESTION_FEEDBACK_COL,
  DC_RESPONSE_FEEDBACK_COL,
  DC_STAT_FEEDBACK_COL,
  LLM_STAT_FEEDBACK_COL,
  QUERY_ID_COL,
  USER_COL,
} from "./constants";
import { Response } from "./types";

// Add a new doc for a call
async function addCallToStore(
  sheetId: string,
  queryId: number,
  callId: number
): Promise<void> {
  const docRef = doc(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls",
    String(callId)
  );
  // Need to set a field in order to create the document
  setDoc(docRef, { id: callId });
}

// Save response to Firestore
export async function saveToStore(
  userEmail: string,
  sheetId: string,
  queryId: number,
  callId: number,
  response: Response
): Promise<void> {
  await addCallToStore(sheetId, queryId, callId);
  const docRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls",
    String(callId),
    "responses"
  );
  const savedResponse = { ...response, userEmail, timestamp: new Date() };
  addDoc(docRef, savedResponse);
}

export async function getCallData(
  sheetId: string,
  queryId: number,
  callId: number
): Promise<DocumentData | null> {
  console.log("database: get call data");
  // Define the document reference
  const collectionRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls",
    String(callId),
    "responses"
  );
  const snapshot = await getDocs(collectionRef);
  const numDocs = snapshot.docs.length;
  if (numDocs === 0) {
    return null;
  }
  return snapshot.docs[numDocs - 1].data();
}

export async function saveToSheet(
  userEmail: string,
  doc: GoogleSpreadsheet,
  queryId: number,
  callId: number,
  response: Response
): Promise<void> {
  const sheet = doc.sheetsByTitle[DC_FEEDBACK_SHEET];
  sheet.addRow({
    [QUERY_ID_COL]: queryId,
    [CALL_ID_COL]: callId,
    [USER_COL]: userEmail,
    [DC_QUESTION_FEEDBACK_COL]: response.question,
    [DC_RESPONSE_FEEDBACK_COL]: response.dcResponse,
    [LLM_STAT_FEEDBACK_COL]: response.llmStat,
    [DC_STAT_FEEDBACK_COL]: response.dcStat,
  });
}

/**
 * Gets the number of calls for a query
 * @param sheetId the sheet id
 * @param queryId the query id
 */
export async function getCallCount(
  sheetId: string,
  queryId: number
): Promise<number> {
  // Define the document reference
  const collectionRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    String(queryId),
    "calls"
  );
  const snapshot = await getCountFromServer(collectionRef);
  return snapshot.data().count;
}
