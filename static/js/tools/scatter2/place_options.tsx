/**
 * Copyright 2020 Google LLC
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
 * Place options for selecting the child place type and the enclosing place.
 */

import React, { useContext, useEffect } from "react";
import _ from "lodash";
import { Card } from "reactstrap";
import { Context, AxisWrapper, PlaceInfo, PlaceInfoWrapper } from "./context";
import { SearchBar } from "../timeline_search";
import { getPlaceNames } from "../timeline_util";
import { getPlacesInNames } from "./util";

import { Container, Row, Col, CustomInput } from "reactstrap";

/**
 * Possible child place types.
 */
const EnclosedTypes = [
  // "Country", // TODO: Search bar should be able to search for "Earth".
  "State",
  "County",
  "City",
  "Town",
  "Village",
  "Borough",
  "CensusZipCodeTabulationArea",
  "EurostatNUTS1",
  "EurostatNUTS2",
  "EurostatNUTS3",
  "AdministrativeArea1",
  "AdministrativeArea2",
  "AdministrativeArea3",
  "AdministrativeArea4",
  "AdministrativeArea5",
];

function PlaceOptions(): JSX.Element {
  const { place, x, y } = useContext(Context);

  /**
   * Reloads child places if the enclosing place or child place type changes.
   */
  useEffect(() => {
    if (!shouldLoadPlaces(place.value)) {
      return;
    }
    loadPlaces(place);
  }, [place.value]);

  return (
    <Card>
      <Container>
        <Row>
          <Col xs="auto">Plot places of type</Col>
          <Col xs="3">
            <CustomInput
              id="enclosed-place-type"
              type="select"
              value={place.value.enclosedPlaceType}
              onChange={(e) => selectEnclosedPlaceType(x, y, place, e)}
            >
              <option value="">Select a place type</option>
              {EnclosedTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </CustomInput>
          </Col>
          <Col xs="auto">in</Col>
          <Col>
            <div id="search">
              <SearchBar
                places={
                  place.value.enclosingPlace.dcid
                    ? {
                        [place.value.enclosingPlace.dcid]:
                          place.value.enclosingPlace.name,
                      }
                    : {}
                }
                addPlace={(e) => selectEnclosingPlace(x, y, place, e)}
                removePlace={() => unselectEnclosingPlace(x, y, place)}
                numPlacesLimit={1}
              />
            </div>
          </Col>
        </Row>
      </Container>
    </Card>
  );
}

/**
 * Checks if the child place type and the enclosing place have been selected but
 * the child places are not.
 * @param place
 */
function shouldLoadPlaces(place: PlaceInfo): boolean {
  return (
    place.enclosedPlaceType &&
    place.enclosingPlace.dcid &&
    _.isEmpty(place.enclosedPlaces)
  );
}

/**
 * Loads child places.
 * @param place
 */
async function loadPlaces(place: PlaceInfoWrapper): Promise<void> {
  let dcidToName: Record<string, string>;
  try {
    dcidToName = await getPlacesInNames(
      place.value.enclosingPlace.dcid,
      place.value.enclosedPlaceType
    );
  } catch (err) {
    dcidToName = {};
  }

  if (!_.isEmpty(dcidToName)) {
    place.setEnclosedPlaces(
      _.keys(dcidToName).map((dcid) => ({
        dcid: dcid,
        name: dcidToName[dcid] || dcid,
      }))
    );
  } else {
    alert(
      `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ${place.value.enclosedPlaceType}`
    );
  }
}

/**
 * Selects child place type and clears population and statvar data.
 * @param x
 * @param y
 * @param place
 * @param event
 */
function selectEnclosedPlaceType(
  x: AxisWrapper,
  y: AxisWrapper,
  place: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
) {
  place.setEnclosedPlaceType(event.target.value);
}

/**
 * Selects the enclosing place and clears population and statvar data.
 * @param x
 * @param y
 * @param place
 * @param dcid
 */
async function selectEnclosingPlace(
  x: AxisWrapper,
  y: AxisWrapper,
  place: PlaceInfoWrapper,
  dcid: string
) {
  const dcidToName = await getPlaceNames([dcid]);
  place.setEnclosingPlace({ dcid: dcid, name: dcidToName[dcid] });
}

/**
 * Removes the enclosing place and clears the child places and
 * population and statvar data.
 * @param place
 */
function unselectEnclosingPlace(
  x: AxisWrapper,
  y: AxisWrapper,
  place: PlaceInfoWrapper
) {
  place.setEnclosingPlace({ dcid: "", name: "" });
}

export { PlaceOptions };
