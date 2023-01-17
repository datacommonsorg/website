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
 * Main component for the disaster dashboard.
 */

import React, { useEffect, useState } from "react";

import { ParentPlace } from "../../place/parent_breadcrumbs";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { getParentPlacesPromise } from "../../utils/place_utils";

interface ParentBreadcrumbsPropType {
  /**
   * The place to show parent places for.
   */
  place: NamedTypedPlace;
}

export function ParentBreadcrumbs(
  props: ParentBreadcrumbsPropType
): JSX.Element {
  const [parentPlaces, setParentPlaces] = useState<NamedTypedPlace[] | undefined>();
  useEffect(() => {
    getParentPlacesPromise(props.place.dcid).then((parentPlaces) =>
      setParentPlaces(parentPlaces)
    );
  }, []);

  let breadcrumbs;
  if (parentPlaces) {
    const num = parentPlaces.length;
    breadcrumbs = parentPlaces.map((place, index) => {
      if (place.types[0] == 'Continent') return;
      const name = place.name.split(",")[0];
      return (
        <React.Fragment key={place.dcid}>
          <a className="place-links"
            href={`/disasters/${place.dcid}`}>{name}</a>
          {index < num - 1 && <span>, </span>}
        </React.Fragment>
      );
    });
  }

  return (
    <>
      {props.place.types[0] != "Planet" && parentPlaces ? (
        <h3>
          { props.place.types[0] } { props.place.types[0] == 'Country' ? 'on' : 'in' } { breadcrumbs }
        </h3>
      ) : (
        <h3 className="invisible"></h3>
      )}
    </>
  );
}
