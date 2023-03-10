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
import { JsxElement } from "typescript";

import { ArcTableRow } from "../../browser/arc_table_row";
import { GoogleMap } from "../../components/google_map";
import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { formatNumber, intl } from "../../i18n/i18n";
import { NamedTypedPlace, PropertyValue } from "../../shared/types";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";

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

type PropVals = Array<PropertyValue>;
type PropertyDict = Record<string, PropVals>;
const PAGE_ID = "event";

/**
 * Stores information about the particular event node the event page should render.
 */
interface AppPropsType {
  dcid: string;
  name: string;
  properties: PropertyDict;
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
      <>
        <a className="place-links" href={`/disasters/${place.dcid}`}>
          {place.name}
        </a>
        {i < allPlaces.length - 1 ? ", " : ""}
      </>
    ));
  }

  const provenanceJsx = props.provenance.map((p, i) => (
    <>
      <a href={p.url}>{p.sourceName}</a>
      {i < props.provenance.length - 1 ? ", " : ""}
    </>
  ));

  return (
    <RawIntlProvider value={intl}>
      <Container>
        <div className="head-section">
          <h1>{props.name}</h1>
          <h3>
            <span>{_.startCase(typeOf[0].name)}</span>
            {placeBreadcrumbsJsx && <> in {placeBreadcrumbsJsx}</>}
          </h3>
          <h4 className="clearfix">
            <span>Data source: {provenanceJsx}</span>
            <a className="float-right" href={`/browser/${props.dcid}`}>
              Graph Browser ›
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
                          text: formatNumericValue(props.properties[property]),
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
 * Returns the first property in the list with any of the given dcids.
 */
function findProperty(dcids: string[], properties: PropertyDict): PropVals {
  for (const k of dcids) {
    if (k in properties) {
      return properties[k];
    }
  }
  return undefined;
}

/**
 * Returns the first display value of the property.
 */
function getValue(property: PropVals): string {
  if (!property || !property.length) {
    return "";
  }
  return property[0].dcid || property[0].value;
}

/**
 * Formats the first display value of the property as a number with unit.
 */
function formatNumericValue(property: PropVals): string {
  const val = getValue(property);
  if (!val) {
    return "";
  }
  const numIndex = val.search(/[0-9]/);
  if (numIndex < 0) {
    return val;
  }
  let unit = val.substring(0, numIndex);
  if (unit) {
    unit = unit.trim();
  }
  const num = Number.parseFloat(val.substring(numIndex));
  return formatNumber(num, unit);
}

/**
 * Formats the date range for the event.
 */
function getDateDisplay(properties: PropertyDict): string {
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

/**
 * Parses a lat,long pair from the first value of the property.
 */
function parseLatLong(property: PropVals): [number, number] {
  if (!property || !property.length) return null;
  const val = property[0];
  if (val.name) {
    const latLong = val.name.split(",").map((f) => parseFloat(f));
    console.assert(latLong.length == 2);
    return [latLong[0], latLong[1]];
  }
  return null;
}
