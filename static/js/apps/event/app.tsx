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
import { RawIntlProvider } from "react-intl";
import { Container } from "reactstrap";

import { ArcTableRow } from "../../browser/arc_table_row";
import { GoogleMap } from "../../components/google_map";
import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { intl } from "../../i18n/i18n";
import { PropertyValues } from "../../shared/api_response_types";
import { NamedTypedPlace } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";
import {
  findProperty,
  formatPropertyNodeValue,
  getValue,
  parseLatLong,
} from "../../utils/property_value_utils";

const _START_DATE_PROPERTIES = ["startDate", "discoveryDate"];
const _END_DATE_PROPERTIES = ["endDate", "containmentDate", "controlledDate"];
const _LOCATION_PROPERTIES = ["location", "startLocation"];
const _GEOJSON_PROPERTIES = [
  "firePerimeter",
  "geoJsonCoordinates",
  "geoJsonCoordinatesDP1",
  "geoJsonCoordinatesDP2",
  "geoJsonCoordinatesDP3",
];
const _IGNORED_PROPERTIES = new Set([
  "name",
  "typeOf",
  "provenance",
  "observationPeriod",
  "irwinID",
  "wfigsFireID",
  "affectedPlace",
  ..._LOCATION_PROPERTIES,
  ..._GEOJSON_PROPERTIES,
  ..._START_DATE_PROPERTIES,
  ..._END_DATE_PROPERTIES,
]);

interface Provenance {
  url: string;
  sourceName: string;
}

const PAGE_ID = "event";

/**
 * Stores information about the particular event node the event page should render.
 */
interface AppPropsType {
  dcid: string;
  name: string;
  properties: PropertyValues;
  provenance: Array<Provenance>;
  // For subject page
  place: NamedTypedPlace;
  subjectConfig: SubjectPageConfig;
  parentPlaces: NamedTypedPlace[];
}

/**
 * Main component for rendering an event page.
 * Displays the properties and property values of the event described.
 */
export function App(props: AppPropsType): JSX.Element {
  const typeOf = findProperty(["typeOf"], props.properties);
  const geoJson = getValue(findProperty(_GEOJSON_PROPERTIES, props.properties));
  const latLong = parseLatLong(
    findProperty(_LOCATION_PROPERTIES, props.properties)
  );

  // Filter then alpha sort properties.
  const tableProperties = Object.keys(props.properties).filter(
    (p) => !_IGNORED_PROPERTIES.has(p)
  );
  tableProperties.sort();

  const dateDisplay = getDateDisplay(props.properties);
  let placeBreadcrumbsJsx: JSX.Element[];
  if (props.place.dcid) {
    const allPlaces = [props.place, ...props.parentPlaces];
    placeBreadcrumbsJsx = allPlaces.map((place, i) => (
      <React.Fragment key={place.dcid}>
        <a className="place-links" href={`/disasters/${place.dcid}`}>
          {place.name}
        </a>
        {i < allPlaces.length - 1 ? ", " : ""}
      </React.Fragment>
    ));
  }

  const provenanceJsx = props.provenance.map((p, i) => (
    <React.Fragment key={p.url}>
      <a href={p.url}>{p.sourceName}</a>
      {i < props.provenance.length - 1 ? ", " : ""}
    </React.Fragment>
  ));

  return (
    <RawIntlProvider value={intl}>
      <Container>
        <div className="head-section">
          <h1>{props.name}</h1>
          <h3>
            <span>{_.startCase(typeOf[0].name || typeOf[0].dcid)}</span>
            {placeBreadcrumbsJsx && <> in {placeBreadcrumbsJsx}</>}
          </h3>
          <h4 className="clearfix">
            <span>Data source: {provenanceJsx}</span>
            <a className="float-right" href={`/browser/${props.dcid}`}>
              Knowledge Graph ›
            </a>
          </h4>
        </div>
        {(geoJson || latLong) && (
          <GoogleMap
            dcid={props.dcid}
            geoJsonGeometry={geoJson}
            latLong={latLong}
          />
        )}
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
                      key={property + index}
                      propertyLabel={_.startCase(property)}
                      values={[
                        {
                          text: formatPropertyNodeValue(
                            props.properties[property]
                          ),
                        },
                      ]}
                      noPropLink={true}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
      <Container>
        <SubjectPageMainPane
          id={PAGE_ID}
          place={props.place}
          pageConfig={props.subjectConfig}
          parentPlaces={props.parentPlaces}
        />
      </Container>
    </RawIntlProvider>
  );
}

/**
 * Formats the date range for the event.
 */
function getDateDisplay(properties: PropertyValues): string {
  const startDate = getValue(findProperty(_START_DATE_PROPERTIES, properties));
  const endDate = getValue(findProperty(_END_DATE_PROPERTIES, properties));

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
