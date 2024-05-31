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

import { addDoc, collection, DocumentData, getDocs } from "firebase/firestore";
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
import { Response } from "./feedback_form";

// Save response to Firestore
export async function saveToStore(
  sheetId: string,
  queryId: string,
  callId: string,
  response: Response
): Promise<void> {
  const docRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    queryId,
    "calls",
    callId,
    "responses"
  );
  addDoc(docRef, response);
}

export async function getCallData(
  sheetId: string,
  queryId: string,
  callId: string
): Promise<DocumentData | null> {
  // Define the document reference
  const collectionRef = collection(
    db,
    "sheets",
    sheetId,
    "queries",
    queryId,
    "calls",
    callId,
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
  doc: GoogleSpreadsheet,
  queryId: string,
  callId: string,
  response: Response
): Promise<void> {
  const sheet = doc.sheetsByTitle[DC_FEEDBACK_SHEET];
  sheet.addRow({
    [QUERY_ID_COL]: queryId,
    [CALL_ID_COL]: callId,
    [USER_COL]: response.userEmail,
    [DC_QUESTION_FEEDBACK_COL]: response.question,
    [DC_RESPONSE_FEEDBACK_COL]: response.dcResponse,
    [LLM_STAT_FEEDBACK_COL]: response.llmStat,
    [DC_STAT_FEEDBACK_COL]: response.dcStat,
  });
}
