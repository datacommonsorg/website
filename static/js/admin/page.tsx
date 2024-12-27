/**
 * Copyright 2023 Google LLC
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

/**
 * Admin Page.
 */

import axios from "axios";
import _ from "lodash";
import React, { useState } from "react";
import { Button } from "reactstrap";

export function Page(): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [secret, setSecret] = useState<string>("");
  const [loadResponse, setLoadResponse] = useState<any>(null);

  function onEditSecret(text: string): void {
    setSecret(text);
  }
  function onLoadData(): void {
    const formData = new FormData();
    formData.append("secret", secret);
    setLoading(true);
    axios
      .post("/admin/load-data", formData)
      .then((resp) => {
        setLoading(false);
        setLoadResponse(resp.data);
      })
      .catch((e) => {
        setLoading(false);
        setLoadResponse(e.response);
      });
  }

  return (
    <div>
      Enter admin secret in the text box, then click &quot;Load Data&quot;
      <br />
      <div id="load-data">
        <input
          type="text"
          id="admin-secret"
          name="admin-secret"
          onChange={(event): void => onEditSecret(event.target.value)}
        ></input>
        <Button
          id="load-data-buttom"
          size="sm"
          color="light"
          onClick={(): void => onLoadData()}
        >
          Load Data
        </Button>
        <div>{loading && <span className="loading">LOADING...</span>}</div>
        {!_.isEmpty(loadResponse) && !loading && (
          <pre className="json-display">
            {JSON.stringify(loadResponse, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
