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

import React from "react";
import ReactDOM from "react-dom";

import { EventPage } from "./page";
import { Property } from "./types";

/**
 * Parses response from triples API for later rendering.
 */
function parseTriplesApiResponse(resp: string): Array<Property> {
  const respJson = JSON.parse(resp.replaceAll("'", '"')); //JSON.parse requires double quotes
  const parsedResponse = [];
  for (const [property, connectedNodes] of Object.entries(respJson)) {
    if (Object.prototype.hasOwnProperty.call(connectedNodes, "nodes")) {
      parsedResponse.push({ dcid: property, values: connectedNodes["nodes"] });
    }
  }
  return parsedResponse;
}

window.onload = () => {
  const dcid = document.getElementById("node").dataset.dcid;
  const nodeName = document.getElementById("node").dataset.nn;
  const properties = parseTriplesApiResponse(
    document.getElementById("node").dataset.pv
  );
  ReactDOM.render(
    React.createElement(EventPage, {
      dcid: dcid,
      name: nodeName,
      properties: properties,
    }),
    document.getElementById("node")
  );
};
