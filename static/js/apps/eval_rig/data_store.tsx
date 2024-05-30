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

import { db } from "../../utils/firebase";
import { Response } from "./feedback_form";

// Save response to Firestore
export async function saveResponse(
  sheetId: string,
  queryId: string,
  callId: string,
  response: Response
): Promise<void> {
  try {
    // Define the document reference
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
    // Save the data to Firestore
    await addDoc(docRef, response);
    console.log("API Call data saved successfully");
  } catch (error) {
    console.error("Error writing document: ", error);
  }
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
