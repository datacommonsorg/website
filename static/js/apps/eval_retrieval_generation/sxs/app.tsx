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

import { OAuthCredential, User } from "firebase/auth";
import { GoogleSpreadsheet } from "google-spreadsheet";
import React, { useState } from "react";

import { GoogleSignIn } from "../../../utils/google_signin";
import { SinglePane } from "./single_pane";

interface AppPropType {
  sheetIdLeft: string;
  sheetIdRight: string;
  queryId: number;
}

export function App(props: AppPropType): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [docLeft, setDocLeft] = useState<GoogleSpreadsheet>(null);
  const [docRight, setDocRight] = useState<GoogleSpreadsheet>(null);

  async function handleUserSignIn(
    user: User,
    credential: OAuthCredential
  ): Promise<void> {
    if (credential.accessToken) {
      setUser(user); // Set the user state to the signed-in user
      const docLeft = new GoogleSpreadsheet(props.sheetIdLeft, {
        token: credential.accessToken,
      });
      const docRight = new GoogleSpreadsheet(props.sheetIdRight, {
        token: credential.accessToken,
      });
      await Promise.all([docLeft.loadInfo(), docRight.loadInfo()]);
      setDocLeft(docLeft);
      setDocRight(docRight);
    }
  }

  return (
    <>
      {!user && (
        <div className="sign-in">
          <GoogleSignIn
            onSignIn={handleUserSignIn}
            scopes={["https://www.googleapis.com/auth/spreadsheets"]}
          />
        </div>
      )}

      {user && (
        <>
          <p>Signed in as {user.email}</p>
          <div className="app-content">
            {docLeft && <SinglePane doc={docLeft} queryId={props.queryId} />}
            <div className="divider" />
            {docRight && <SinglePane doc={docRight} queryId={props.queryId} />}
          </div>
        </>
      )}
    </>
  );
}
