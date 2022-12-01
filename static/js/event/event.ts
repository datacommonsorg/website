/**
 * Copyright 2022 Google LLC
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
 * Disaster events
 */

import axios from "axios";
import React from "react";
import ReactDOM from "react-dom";

import { EventPage, Page } from "./page";
import { Property } from "./types";

function parseApiResponse(resp): Array<Property> {
  // Parses response from triples API for later rendering
  const parsedResponse = [];
  for (const [property, connectedNodes] of Object.entries(resp)) {
    for (const nodes of Object.values(connectedNodes)) {
      parsedResponse.push({ name: property, values: nodes });
    }
  }
  return parsedResponse;
}

window.onload = () => {
  const dcid = document.getElementById("node").dataset.dcid;
  const nodeName = document.getElementById("node").dataset.nn;
  const propertiesPromise = axios
    .get(`/api/node/triples/out/${dcid}`)
    .then((resp) => resp.data)
    .catch(() => {
      return 0;
    });
  propertiesPromise
    .then((apiResponse) => {
      const parsedResponse = parseApiResponse(apiResponse);
      ReactDOM.render(
        React.createElement(EventPage, {
          dcid: dcid,
          name: nodeName,
          properties: parsedResponse,
        }),
        document.getElementById("node")
      );
    })
    .catch(() => {
      ReactDOM.render(
        React.createElement(Page),
        document.getElementById("main-pane")
      );
    });
};
