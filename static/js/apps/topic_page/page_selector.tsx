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
 * Component for selecting topic and place.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { CustomInput } from "reactstrap";

import { NamedTypedPlace } from "../../shared/types";
import { TopicsSummary } from "../../types/app/topic_page_types";
import { getPlaceNames } from "../../utils/place_utils";

interface PageSelectorPropType {
  selectedPlace: NamedTypedPlace;
  morePlaces: string[];
  selectedTopic: string;
  topicsSummary: TopicsSummary;
}

export function PageSelector(props: PageSelectorPropType): JSX.Element {
  const [placeOptions, setPlaceOptions] = useState<
    Record<string, string> | undefined
  >({});

  const [morePlaces, setMorePlaces] = useState<NamedTypedPlace[] | undefined>(
    []
  );

  useEffect(() => {
    getPlaceOptions(props.selectedTopic, props.topicsSummary, setPlaceOptions);
  }, [props]);

  useEffect(() => {
    getMorePlaces(props.morePlaces, setMorePlaces);
  }, [props]);

  const topicName =
    props.topicsSummary.topicNameMap[props.selectedTopic] ||
    props.selectedTopic;

  const allNames = [props.selectedPlace.name];
  for (const item of morePlaces) {
    allNames.push(item.name);
  }

  return (
    <div className="page-selector-container">
      <div className="page-selector-section">
        <h1>
          {topicName} in {allNames.join(", ")}
        </h1>
        {/* <div>
          <CustomInput
            id="place-selector"
            type="select"
            value={props.selectedPlace ? props.selectedPlace.dcid : ""}
            onChange={(e) => selectPlace(props.selectedTopic, e)}
            className="pac-target-input"
          >
            {_.isEmpty(props.selectedPlace.dcid) ? (
              <option value="" key="empty">
                Select a place
              </option>
            ) : (
              <option
                value={props.selectedPlace.dcid}
                key={props.selectedPlace.dcid}
              >
                {props.selectedPlace.name}
              </option>
            )}
            {placeOptions &&
              Object.keys(placeOptions)
                .filter((place) => place !== props.selectedPlace.dcid)
                .map((place) => (
                  <option value={place} key={place}>
                    {placeOptions[place]}
                  </option>
                ))}
          </CustomInput>
        </div>
      </div>
      <div className="page-selector-section">
        <CustomInput
          id="topic-selector"
          type="select"
          value={props.selectedTopic}
          onChange={(e) =>
            selectTopic(props.selectedPlace.dcid, props.topicsSummary, e)
          }
          className="pac-target-input"
        >
          <option value={props.selectedTopic} key={props.selectedTopic}>
            {topicName}
          </option>
          {Object.keys(props.topicsSummary.topicNameMap)
            .filter((topic) => topic !== props.selectedTopic)
            .map((topic) => (
              <option value={topic} key={topic}>
                {props.topicsSummary.topicNameMap[topic] || topic}
              </option>
            ))}
        </CustomInput> */}
      </div>
    </div>
  );
}

function getPlaceOptions(
  selectedTopic: string,
  topicsSummary: TopicsSummary,
  setPlaceOptions: (placeOptions: Record<string, string>) => void
): void {
  const placeOptionDcids = topicsSummary.topicPlaceMap[selectedTopic] || [];
  // TODO: make this call in flask and pass it down with the topicsSummary
  getPlaceNames(placeOptionDcids)
    .then((placeNames) => {
      setPlaceOptions(placeNames);
    })
    .catch(() => {
      const placeOptions = {};
      placeOptionDcids.forEach((place) => (placeOptions[place] = place));
      setPlaceOptions(placeOptions);
    });
}

function getMorePlaces(
  placeDcids: string[],
  setMorePlaces: (places: NamedTypedPlace[]) => void
): void {
  getPlaceNames(placeDcids).then((placeNames) => {
    const res: NamedTypedPlace[] = [];
    for (const dcid in placeNames)
      res.push({
        dcid: dcid,
        name: placeNames[dcid],
        types: [],
      });
    setMorePlaces(res);
  });
}

function selectPlace(
  currentTopic: string,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  const place = event.target.value;
  window.open(`/topic/${currentTopic}/${place}`, "_self");
}

function selectTopic(
  currentPlace: string,
  topicsSummary: TopicsSummary,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  const topic = event.target.value;
  const possiblePlaces = topicsSummary.topicPlaceMap[topic];
  if (
    _.isEmpty(currentPlace) ||
    !possiblePlaces.find((place) => place === currentPlace)
  ) {
    window.open(`/topic/${topic}`, "_self");
  } else {
    window.open(`/topic/${topic}/${currentPlace}`, "_self");
  }
}
