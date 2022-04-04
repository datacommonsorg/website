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

import React from "react";
import { CustomInput } from "reactstrap";

import { NamedTypedPlace } from "../shared/types";
import { getPlaceNames } from "../utils/place_utils";
import { TopicsSummary } from "./topic_page";

interface PageSelectorPropType {
  selectedPlace: NamedTypedPlace;
  selectedTopic: string;
  topicsSummary: TopicsSummary;
}

export function PageSelector(props: PageSelectorPropType): JSX.Element {
  // {place_id: place_name}
  const placeOptions = getPlaceOptions(
    props.selectedTopic,
    props.topicsSummary
  );

  const topicName =
    props.topicsSummary.topicNameMap[props.selectedTopic] ||
    props.selectedTopic;

  return (
    <div className="page-selector-container">
      <div className="page-selector-section">
        <h1>
          {topicName} in {props.selectedPlace.name}
        </h1>
      </div>
      <div className="page-selector-section">
        <CustomInput
          id="place-selector"
          type="select"
          value=""
          onChange={(e) => selectPlace(props.selectedTopic, e)}
          className="pac-target-input"
        >
          <option value="" key="empty">
            {topicName} in other places
          </option>
          {placeOptions &&
            Object.keys(placeOptions)
              .sort((a, b) => placeOptions[a].localeCompare(placeOptions[b]))
              .map((place) => (
                <option value={place} key={place}>
                  {placeOptions[place]}
                </option>
              ))}
        </CustomInput>
      </div>
    </div>
  );
}

function getPlaceOptions(
  selectedTopic: string,
  topicsSummary: TopicsSummary
): Record<string, string> {
  const placeOptions: Record<string, string> = {};
  const placeOptionDcids = topicsSummary.topicPlaceMap[selectedTopic] || [];
  for (const placeDcid of placeOptionDcids) {
    placeOptions[placeDcid] = topicsSummary.topicPlaceNames[placeDcid] || "";
  }
  return placeOptions;
}

function selectPlace(
  currentTopic: string,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  const place = event.target.value;
  window.open(`/topic/${currentTopic}/${place}`, "_self");
}
