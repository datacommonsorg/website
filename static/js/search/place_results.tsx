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
 * Result section for matching places
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";

import { getPlaceNames } from "../utils/place_utils";

const PLACE_REDIRECT_PREFIX = "/place/";
const MAP_REDIRECT_PREFIX = "/tools/map#pd=";
const SCATTER_REDIRECT_PREFIX = "/tools/scatter#epd=";
const TIMELINE_REDIRECT_PREFIX = "/tools/timeline#place=";

interface PlaceResultsProps {
  places: string[];
  selectedPlace: string;
}

export function PlaceResults(props: PlaceResultsProps): JSX.Element {
  const [placeNames, setPlaceNames] = useState(null);

  useEffect(() => {
    const placeDcids = props.selectedPlace
      ? [props.selectedPlace]
      : props.places;
    getPlaceNames(placeDcids)
      .then((placeNames) => setPlaceNames(placeNames))
      .catch(() => setPlaceNames({}));
  }, [props]);

  if (_.isEmpty(placeNames)) {
    return <></>;
  }

  return (
    <div className="search-results-place search-results-section">
      {props.selectedPlace ? (
        <div className="search-results-place-selected">
          {getResultItemContentJsx(
            props.selectedPlace,
            placeNames[props.selectedPlace]
          )}
        </div>
      ) : (
        <>
          <div className="search-results-section-title">Places</div>
          <div className="search-results-section-content">
            <div className="search-results-list">
              {props.places.map((place) => {
                return getResultItemContentJsx(place, placeNames[place]);
              })}
            </div>
            <a
              className="search-results-place-explore-all"
              href={PLACE_REDIRECT_PREFIX}
            >
              Explore All Places
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function getResultItemContentJsx(
  placeDcid: string,
  placeName: string
): JSX.Element {
  return (
    <div className="search-results-item" key={`place-result-${placeDcid}`}>
      <div className="search-results-place-item-info">
        <div className="search-results-item-title">
          {placeName || placeDcid}
        </div>
        <div className="search-results-item-byline">dcid: {placeDcid}</div>
        <a href={PLACE_REDIRECT_PREFIX + placeDcid}>Open in place explorer</a>
      </div>
      <div className="search-results-place-links">
        <a
          href={MAP_REDIRECT_PREFIX + placeDcid}
          className="search-results-link-icon"
          id={`map-${placeDcid}`}
        >
          <i className="material-icons-outlined">public</i>
        </a>
        <a
          href={SCATTER_REDIRECT_PREFIX + placeDcid}
          className="search-results-link-icon"
          id={`scatter-${placeDcid}`}
        >
          <i className="material-icons-outlined">scatter_plot</i>
        </a>
        <a
          href={TIMELINE_REDIRECT_PREFIX + placeDcid}
          className="search-results-link-icon"
          id={`timeline-${placeDcid}`}
        >
          <i className="material-icons-outlined">timeline</i>
        </a>
      </div>
    </div>
  );
}
