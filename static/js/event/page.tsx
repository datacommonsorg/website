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
 * Main component for event pages.
 */

import React from "react";

import { Property } from "./types";

interface EventPagePropsType {
  // Stores information about the particular event node
  // the event page should render.
  dcid: string;
  name: string;
  properties: Array<Property>;
}

/**
 * Main component for rendering an event page.
 * Displays the properties and property values of the event described.
 */
export function EventPage(props: EventPagePropsType): JSX.Element {
  return (
    <div>
      <h1>{props.name}</h1>
      <h3>dcid: {props.dcid}</h3>
      <br />
      <h3>Properties:</h3>
      {props.properties.map((property) => {
        return (
          <div key={property.dcid}>
            <b>{property.dcid}:</b>
            <ul>
              {property.values.map((value) => {
                return (
                  <li key={JSON.stringify(value)}>
                    {Object.prototype.hasOwnProperty.call(value, "value")
                      ? value.value
                      : value.dcid}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
