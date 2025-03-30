/**
 * Copyright 2025 Google LLC
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
 * The place-based data overview page.
 */

/** @jsxImportSource @emotion/react */

import React, { ReactElement } from "react";

import { Section } from "../../../../components/elements/layout/section";
import { PlaceData } from "../place_data";
import { PlaceDataOverviewHeader } from "./place_data_overview_header";
import { PlaceSources } from "./place_sources";
import { StatVarPlaceTopics } from "./stat_var_place_topics";

interface PlaceDataOverviewPageProps {
  //the place data object; an object comprising the place, data sources and example stat vars
  placeData: PlaceData;
}

export const PlaceDataOverviewPage = ({
  placeData,
}: PlaceDataOverviewPageProps): ReactElement => {
  return (
    <>
      <PlaceDataOverviewHeader place={placeData.place} />
      <Section>
        <PlaceSources />
      </Section>
      <Section>
        {Object.entries(placeData.topics).map(([topicKey, topic]) => (
          <StatVarPlaceTopics
            key={topicKey}
            place={placeData.place}
            topic={topic.title}
            queries={topic.examples.statvar}
          />
        ))}
      </Section>
    </>
  );
};
