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
import {
  Axis,
  Context,
  StateType,
  PlaceInfo,
  setEnclosedPlaces,
  setEnclosedPlaceType,
  setEnclosingPlace,
  unsetPopulationsAndData,
} from "./context";
import { SearchBar } from "../timeline_search";
import { getPlaceNames } from "../timeline_util";
import { getPlacesIn } from "./util";

import { Container, Row, Col, CustomInput } from "reactstrap";

/**
 * Possible child place types.
 */
const EnclosedTypes = [
  "CensusCoreBasedStatisticalArea",
  "CensusCountyDivision",
  "CensusTract",
  "City",
  "CongressionalDistrict",
  "County",
  "HighSchoolDistrict",
  "SchoolDistrict",
  "State",
  "StateComponent",
];

function PlaceOptions(): JSX.Element {
  const context = useContext(Context);

  /**
   * Reloads child places if the enclosing place or child place type changes.
   */
  useEffect(() => {
    const place = context.place;
    if (!shouldLoadPlaces(place.value)) {
      return;
    }
    loadPlaces(context.place);
  }, [context.place.value]);

  return (
    <Card>
      <Container>
        <Row>
          <Col xs="auto">Plot places of type</Col>
          <Col xs="3">
            <CustomInput
              id="enclosed-place-type"
              type="select"
              value={context.place.value.enclosedPlaceType}
              onChange={(e) =>
                selectEnclosedPlaceType(context.x, context.y, context.place, e)
              }
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
                  context.place.value.enclosingPlace.dcid
                    ? {
                        [context.place.value.enclosingPlace.dcid]:
                          context.place.value.enclosingPlace.name,
                      }
                    : {}
                }
                addPlace={(e) =>
                  selectEnclosingPlace(context.x, context.y, context.place, e)
                }
                removePlace={() =>
                  unselectEnclosingPlace(context.x, context.y, context.place)
                }
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
async function loadPlaces(place: StateType<PlaceInfo>): Promise<void> {
  const dcids = await getPlacesIn(
    place.value.enclosingPlace.dcid,
    place.value.enclosedPlaceType
  );

  if (!_.isEmpty(dcids)) {
    const dcidToName = await getPlaceNames(dcids);
    setEnclosedPlaces(
      place,
      dcids.map((dcid) => ({
        name: dcidToName[dcid],
        dcid: dcid,
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
  x: StateType<Axis>,
  y: StateType<Axis>,
  place: StateType<PlaceInfo>,
  event: React.ChangeEvent<HTMLInputElement>
) {
  setEnclosedPlaceType(place, event.target.value);
  unsetPopulationsAndData(x);
  unsetPopulationsAndData(y);
}

/**
 * Selects the enclosing place and clears population and statvar data.
 * @param x
 * @param y
 * @param place
 * @param dcid
 */
async function selectEnclosingPlace(
  x: StateType<Axis>,
  y: StateType<Axis>,
  place: StateType<PlaceInfo>,
  dcid: string
) {
  const dcidToName = await getPlaceNames([dcid]);
  setEnclosingPlace(place, { dcid: dcid, name: dcidToName[dcid] });
  unsetPopulationsAndData(x);
  unsetPopulationsAndData(y);
}

/**
 * Removes the enclosing place and clears the child places and
 * population and statvar data.
 * @param place
 */
function unselectEnclosingPlace(
  x: StateType<Axis>,
  y: StateType<Axis>,
  place: StateType<PlaceInfo>
) {
  setEnclosingPlace(place, { dcid: "", name: "" });
  unsetPopulationsAndData(x);
  unsetPopulationsAndData(y);
}

export { PlaceOptions };
