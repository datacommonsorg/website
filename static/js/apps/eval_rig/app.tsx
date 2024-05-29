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

import React, { useState } from "react";
import { Col, Input, Row } from "reactstrap";

export function App(): JSX.Element {
  const [userId, setUserId] = useState("");

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(event.target.value);
  };

  return (
    <>
      <div>
        <h1>Enter the user id to take eval job</h1>
        <Input
          type="text"
          value={userId}
          onChange={handleInputChange}
          placeholder="Enter user ID"
        />
      </div>
      {userId && (
        <div>
          <h1>Run the eval job as {userId}</h1>
        </div>
      )}
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
