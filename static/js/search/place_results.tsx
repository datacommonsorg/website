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

import { NamedNode, NamedPlace } from "../shared/types";
import { getPlaceNames } from "../utils/place_utils";

const PLACE_REDIRECT_PREFIX = "/place/";
const MAP_REDIRECT_PREFIX = "/tools/map#pd=";
const SCATTER_REDIRECT_PREFIX = "/tools/scatter#epd=";
const TIMELINE_REDIRECT_PREFIX = "/tools/timeline#place=";
const BROWSER_REDIRECT_PREFIX = "/browser/";

interface PlaceResultsProps {
  places: NamedNode[];
  selectedPlace: string;
}

export function PlaceResults(props: PlaceResultsProps): JSX.Element {
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    if (props.selectedPlace) {
      getPlaceNames([props.selectedPlace])
        .then((placeName) =>
          setSelectedPlace({
            name: placeName[props.selectedPlace] || props.selectedPlace,
            dcid: props.selectedPlace,
          })
        )
        .catch(() =>
          setSelectedPlace({
            name: props.selectedPlace,
            dcid: props.selectedPlace,
          })
        );
    }
  }, [props]);

  if (_.isEmpty(selectedPlace) && _.isEmpty(props.places)) {
    return <></>;
  }

  return (
    <div className="search-results-place search-results-section">
      {selectedPlace ? (
        <div className="search-results-place-selected">
          {getResultItemContentJsx(selectedPlace)}
        </div>
      ) : (
        <>
          <h2 className="search-results-section-title">Places</h2>
          <div className="search-results-section-content">
            <div className="search-results-list">
              {props.places.map((place) => {
                return getResultItemContentJsx(place);
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

function getResultItemContentJsx(place: NamedPlace): JSX.Element {
  return (
    <div className="search-results-item" key={`place-result-${place.dcid}`}>
      <div className="search-results-place-item-info">
        <div className="search-results-item-title">
          {place.name || place.dcid}
        </div>
        <a
          href={BROWSER_REDIRECT_PREFIX + place.dcid}
          className="search-results-item-byline"
        >
          dcid: {place.dcid}
        </a>
        <a href={PLACE_REDIRECT_PREFIX + place.dcid}>Open in place explorer</a>
      </div>
      <div className="search-results-place-links">
        <a
          href={TIMELINE_REDIRECT_PREFIX + place.dcid}
          title="Timelines Explorer"
          className="search-results-link-icon"
          id={`timeline-${place.dcid}`}
        >
          <i className="material-icons-outlined">timeline</i>
        </a>
        <a
          href={MAP_REDIRECT_PREFIX + place.dcid}
          title="Map Explorer"
          className="search-results-link-icon"
          id={`map-${place.dcid}`}
        >
          <i className="material-icons-outlined">public</i>
        </a>
        <a
          href={SCATTER_REDIRECT_PREFIX + place.dcid}
          title="Scatter Plot Explorer"
          className="search-results-link-icon"
          id={`scatter-${place.dcid}`}
        >
          <i className="material-icons-outlined">scatter_plot</i>
        </a>
      </div>
    </div>
  );
}
