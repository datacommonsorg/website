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

import _ from "lodash";
import React from "react";
import { Container } from "reactstrap";

import { ArcTableRow } from "../../browser/arc_table_row";
import { Property } from "../../types/event_types";

const _IGNORED_PROPERTIES = new Set([
  "location",
  "startLocation",
  "firePerimeter",
  "geoJsonCoordinates",
  "geoJsonCoordinatesDP1",
  "geoJsonCoordinatesDP2",
  "geoJsonCoordinatesDP3",
  "name",
  "typeOf",
  "provenance",
  "observationPeriod",
  "containmentDate",
  "controlledDate",
  "discoveryDate",
  "endDate",
  "startDate",
]);

interface AppPropsType {
  // Stores information about the particular event node
  // the event page should render.
  dcid: string;
  name: string;
  properties: Array<Property>;
}

function findProperty(dcid: string, properties: Array<Property>): Property {
  return properties.find((p) => p.dcid == dcid);
}

function findProperties(
  dcids: string[],
  properties: Array<Property>
): Property {
  return properties.find((p) => dcids.indexOf(p.dcid) >= 0);
}

function getValue(property: Property): string {
  if (!property || !property.values.length) {
    return "";
  }
  return property.values[0].value || property.values[0].dcid;
}

function getDateDisplay(properties: Array<Property>): string {
  const startDate = getValue(
    findProperties(["startDate", "discoveryDate"], properties)
  );
  const endDate = getValue(
    findProperties(["endDate", "containmentDate", "controlledDate"], properties)
  );

  let ret = "";
  if (startDate) {
    ret += startDate;
    if (endDate) {
      ret += " — ";
    }
  }
  if (endDate) {
    ret += endDate;
  }
  return ret;
}

/**
 * Main component for rendering an event page.
 * Displays the properties and property values of the event described.
 */
export function App(props: AppPropsType): JSX.Element {
  // TODO: Use original data source, not import name.
  const provenance = findProperty("provenance", props.properties);
  const typeOf = findProperty("typeOf", props.properties);

  const tableProperties = props.properties.filter(
    (p) => !_IGNORED_PROPERTIES.has(p.dcid)
  );
  tableProperties.sort((a, b) => {
    if (a.dcid < b.dcid) return -1;
    if (a.dcid > b.dcid) return 1;
    return 0;
  });

  const dateDisplay = getDateDisplay(props.properties);

  return (
    <Container>
      <div className="head-section">
        <h1>{props.name}</h1>
        <h3>type: {typeOf.values[0].name}</h3>
        <h3>
          dcid: <a href={`/browser/${props.dcid}`}>{props.dcid}</a>
        </h3>
        <h3>
          source:{" "}
          <a href={`/browser/${provenance.values[0].dcid}`}>
            {provenance.values[0].name}
          </a>
        </h3>
      </div>
      <section className="table-page-section">
        <div className="card p-0">
          <table className="node-table">
            <tbody>
              <tr key="header">
                <th className="property-column">Property</th>
                <th>Value</th>
              </tr>
              <ArcTableRow
                key="date"
                propertyLabel="Date"
                values={[{ text: dateDisplay }]}
                noPropLink={true}
              />
              {tableProperties.map((property, index) => {
                return (
                  <ArcTableRow
                    key={property.dcid + index}
                    propertyLabel={_.startCase(property.dcid)}
                    values={property.values.map((v) => {
                      return { text: v.value || v.dcid };
                    })}
                    noPropLink={true}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Container>
  );
}
