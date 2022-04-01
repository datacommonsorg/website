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
 * Results section of the search page. This contains all results besides the
 * custom search results.
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";

import { NamedNode } from "../shared/types";
import { getPlaceDcids } from "../utils/place_utils";
import { getStatVarSearchResults } from "../utils/search_utils";
import { PlaceResults } from "./place_results";
import { StatVarResults } from "./statvar_results";

interface ResultsProps {
  query: string;
  selectedPlace: string;
}

let acs: google.maps.places.AutocompleteService;

export function AllResults(props: ResultsProps): JSX.Element {
  const [places, setPlaces] = useState(null);
  const [statVars, setStatVars] = useState(null);

  useEffect(() => {
    if (google.maps) {
      acs = new google.maps.places.AutocompleteService();
    }
  }, []);

  useEffect(() => {
    if (acs && !props.selectedPlace) {
      acs.getPlacePredictions(
        { input: props.query, types: ["(regions)"] },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            const placeIds = predictions.map(
              (prediction) => prediction.place_id
            );
            getPlaceDcids(placeIds)
              .then((dcids) => {
                const namedPlaces = predictions
                  .map((prediction) => {
                    if (prediction.place_id in dcids) {
                      return {
                        dcid: dcids[prediction.place_id],
                        name: prediction.description,
                      };
                    }
                  })
                  .filter((place) => !_.isEmpty(place));
                setPlaces(namedPlaces);
              })
              .catch(() => {
                setPlaces([]);
              });
          } else {
            setPlaces([]);
          }
        }
      );
    } else {
      setPlaces([]);
    }
  }, [props]);

  useEffect(() => {
    getStatVarSearchResults(props.query, [])
      .then((data) => {
        const statVars: NamedNode[] = [];
        data.statVarGroups.forEach((svg) => {
          if (!_.isEmpty(svg.statVars)) {
            statVars.push(...svg.statVars);
          }
        });
        if (!_.isEmpty(data.statVars)) {
          statVars.push(...data.statVars);
        }
        setStatVars(statVars);
      })
      .catch(() => {
        setStatVars([]);
      });
  }, [props]);

  if (_.isNull(places) || _.isNull(statVars)) {
    return <></>;
  }

  return (
    <>
      <PlaceResults places={places} selectedPlace={props.selectedPlace} />
      <StatVarResults statVars={statVars} />
    </>
  );
}
