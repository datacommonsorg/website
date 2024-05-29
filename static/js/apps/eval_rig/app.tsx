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
import { Col, Row } from "reactstrap";

import { GoogleSignIn } from "../../utils/google_signin";

export function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);

  const handleUserSignIn = (user: User, credential: OAuthCredential) => {
    if (credential.accessToken) {
      setUser(user); // Set the user state to the signed-in user
      const doc = new GoogleSpreadsheet(
        "1uKpyVhqh5TWTOkxAA0vNUnw03IQFfRDfRHT6eXVcktQ",
        {
          token: credential.accessToken,
        }
      );
      doc.loadInfo().then(() => {
        console.log(doc.title);
      });
    }
  };

  return (
    <>
      <div>
        {!user && (
          <GoogleSignIn
            onSignIn={handleUserSignIn}
            scopes={["https://www.googleapis.com/auth/spreadsheets"]}
          />
        )}
        {user && <p>Signed in as {user.email}</p>}
      </div>
      <Row>
        <Col>
          <h1>This is a list of queries</h1>
        </Col>
        <Col>
          <h1>This is the raw output</h1>
        </Col>
        <Col>
          <h1>This is the eval workspace</h1>
        </Col>
      </Row>
    </>
  );
}
