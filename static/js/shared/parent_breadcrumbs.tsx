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
 * Parent breadcrumbs for disaster dashboard.
 */

import React from "react";

import { formatString, ReplacementStrings } from "../utils/tile_utils";
import { NamedTypedPlace } from "./types";

interface ParentBreadcrumbsPropType {
  /**
   * The place to show parent places for.
   */
  place: NamedTypedPlace;
  /**
   * List of parent places.
   */
  parentPlaces: NamedTypedPlace[];
  /**
   * Format string must include ${placeDcid} for child place URLs.
   */
  urlFormatString: string;
}

export function ParentBreadcrumbs(
  props: ParentBreadcrumbsPropType
): JSX.Element {
  let placeType = props.place.types[0];
  for (const type of props.place.types) {
    // prefer to use specific type like "State" or "County" over
    // of "AdministrativeArea"
    if (!type.startsWith("AdministrativeArea") && type != "Place") {
      placeType = type;
      break;
    }
  }

  const num = props.parentPlaces.length;
  const breadcrumbs = props.parentPlaces.map((place, index) => {
    const name = place.name.split(",")[0];
    const rs: ReplacementStrings = {
      placeDcid: place.dcid,
    };
    return (
      <React.Fragment key={place.dcid}>
        <a
          className="place-links"
          href={formatString(props.urlFormatString, rs)}
        >
          {name}
        </a>
        {index < num - 1 && <span>, </span>}
      </React.Fragment>
    );
  });

  return (
    <>
      {props.place.types[0] != "Planet" && props.parentPlaces ? (
        <h3>
          {placeType} {placeType == "Continent" ? "on" : "in"} {breadcrumbs}
        </h3>
      ) : (
        <h3 className="invisible"></h3>
      )}
    </>
  );
}
