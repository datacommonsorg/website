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
 * Component for the ranking section of the disaster dashboard
 */

import _ from "lodash";
import React from "react";

import { DisasterEventPoint } from "../types/disaster_event_map_types";
import {
  DISASTER_EVENT_INTENSITIES,
  DISASTER_EVENT_TYPES,
  DisasterType,
} from "./constants";

const RANKING_ITEMS_COUNT = 5;

interface RankingUnitInfo {
  title: string;
  prop: string;
  ranking: DisasterEventPoint[];
}

interface RankingSectionPropType {
  disasterEventPoints: DisasterEventPoint[];
  selectedDisaster: DisasterType;
  selectedIntensityProp: string;
  onIntensityPropSelected: (prop: string) => void;
}

export function RankingSection(props: RankingSectionPropType): JSX.Element {
  const rankedDisasterCounts = getRankedDisasterCounts(
    props.disasterEventPoints
  );
  const rankingUnits = getRankingUnits(
    props.disasterEventPoints,
    props.selectedDisaster
  );
  const addSelectionCss =
    !_.isEmpty(DISASTER_EVENT_INTENSITIES[props.selectedDisaster]) &&
    DISASTER_EVENT_INTENSITIES[props.selectedDisaster].length > 1;
  const getRankingUnitClassName = (prop: string) => {
    if (!addSelectionCss) {
      return "ranking-unit-no-selection";
    }
    return prop === props.selectedIntensityProp
      ? "ranking-unit-selected"
      : "ranking-unit";
  };
  return (
    <div className="ranking-section">
      {props.selectedDisaster === DisasterType.ALL && (
        <>
          <h3>Count of Events</h3>
          {rankedDisasterCounts.map(({ disaster, count }) => {
            return (
              <div key={"count-" + disaster} className="ranking-unit-item">
                {disaster}: {count}
              </div>
            );
          })}
        </>
      )}
      {(!_.isEmpty(rankingUnits) ||
        props.selectedDisaster !== DisasterType.ALL) && (
        <>
          <h3>Rankings</h3>
          {rankingUnits.map((rankingUnit) => {
            // TODO: make each div a regular <a> link and update navigation
            // of disaster dashboard
            return (
              <div
                onClick={() => props.onIntensityPropSelected(rankingUnit.prop)}
                className={getRankingUnitClassName(rankingUnit.prop)}
                key={rankingUnit.prop}
              >
                <div className={"ranking-unit-title"}>{rankingUnit.title}</div>
                {rankingUnit.ranking
                  .slice(0, RANKING_ITEMS_COUNT)
                  .map((event) => {
                    return (
                      <div
                        key={`${rankingUnit.prop}-${event.placeDcid}`}
                        className="ranking-unit-item"
                      >
                        {event.placeName}: {event.intensity[rankingUnit.prop]}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/**
 * Gets and ranks the count of events for each disaster type
 * @param disasterEventData list of disaster event points
 */
export function getRankedDisasterCounts(
  disasterEventData: DisasterEventPoint[]
): { disaster: string; count: number }[] {
  const counts = {};
  if (!_.isEmpty(disasterEventData)) {
    for (const eventData of disasterEventData) {
      if (!(eventData.disasterType in counts)) {
        counts[eventData.disasterType] = 0;
      }
      counts[eventData.disasterType]++;
    }
  }
  const rankedDisasters = Object.keys(DISASTER_EVENT_TYPES).sort((a, b) => {
    if (counts[b] && counts[a]) {
      return counts[b] - counts[a];
    } else if (counts[b]) {
      return 1;
    } else {
      return -1;
    }
  });
  return rankedDisasters.map((disaster) => {
    return {
      disaster,
      count: counts[disaster] || 0,
    };
  });
}

/**
 * Gets ranking units where each unit is a ranking of event points based on a
 * single prop
 * @param disasterEventData
 * @param selectedDisaster
 * @returns
 */
export function getRankingUnits(
  disasterEventData: DisasterEventPoint[],
  selectedDisaster: DisasterType
): RankingUnitInfo[] {
  const rankings = [];
  const props = DISASTER_EVENT_INTENSITIES[selectedDisaster] || [];
  if (_.isEmpty(disasterEventData)) {
    return rankings;
  }
  for (const prop of props) {
    const sortedEvents = _.clone(disasterEventData).sort((a, b) => {
      const eventDataAVal = a.intensity[prop];
      const eventDataBVal = b.intensity[prop];
      if (eventDataAVal && eventDataBVal) {
        return eventDataBVal - eventDataAVal;
      } else if (eventDataAVal) {
        return -1;
      } else if (eventDataBVal) {
        return 1;
      } else {
        return 0;
      }
    });
    rankings.push({
      title: prop,
      prop,
      ranking: sortedEvents,
    });
  }
  return rankings;
}
