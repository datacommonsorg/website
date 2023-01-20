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
 * Component for rendering a tile which ranks events by severity.
 */

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { ChartEmbed } from "../../place/chart_embed";
import { NamedTypedPlace } from "../../shared/types";
import {
  DisasterEventPoint,
  DisasterEventPointData,
} from "../../types/disaster_event_map_types";
import {
  EventTypeSpec,
  TopEventTileSpec,
} from "../../types/subject_page_proto_types";
import {
  fetchDisasterEventPoints,
  getSeverityFilters,
} from "../../utils/disaster_event_map_utils";
import { formatNumber } from "../../utils/string_utils";

const RANKING_COUNT = 10;
const NUM_FRACTION_DIGITS = 0;

interface TopEventTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  topEventMetadata: TopEventTileSpec;
  eventTypeSpec: EventTypeSpec;
  className?: string;
}

export function TopEventTile(props: TopEventTilePropType): JSX.Element {
  const [topEvents, setTopEvents] = useState<
    DisasterEventPoint[] | undefined
  >();
  // const embedModalElement = useRef<ChartEmbed>(null);
  const chartContainer = useRef(null);
  const eventTypeSpecs = {
    [props.eventTypeSpec.id]: props.eventTypeSpec,
  };
  const severityProp = props.eventTypeSpec.defaultSeverityFilter.prop;

  useEffect(() => {
    fetchData();
  }, [props]);

  return (
    <div
      className={`chart-container ranking-tile ${props.className}`}
      ref={chartContainer}
    >
      {!_.isEmpty(topEvents) && (
        <div className="ranking-unit-container">
          <div className="ranking-list">
            <h4>{props.title}</h4>
            <table>
              <tbody>
                {topEvents.map((event, i) => {
                  console.log(event);
                  return (
                    <tr key={i}>
                      <td className="rank">{i + 1}</td>
                      <td className="place-name">
                        <a href={`/event/${event.placeDcid}`}>
                          {event.placeName}
                        </a>
                      </td>
                      <td className="stat">
                        <span className="num-value">
                          {formatNumber(
                            event.severity[severityProp],
                            props.eventTypeSpec.defaultSeverityFilter.unit,
                            false,
                            NUM_FRACTION_DIGITS
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* <footer>
                    <a
                      href="#"
                      onClick={(event) => {
                        handleEmbed(event, points);
                      }}
                    >
                      Export
                    </a>
                  </footer> */}
          </div>
        </div>
      )}
      {/* <ChartEmbed ref={embedModalElement} /> */}
    </div>
  );

  function fetchData() {
    fetchDisasterEventPoints(
      [props.eventTypeSpec],
      props.place.dcid,
      ["2022-01", "2022-12"], // TODO(beets): Use getDateRanges
      getSeverityFilters(eventTypeSpecs),
      false /* useCache */
    )
      .then((disasterEventData) => {
        const sources = new Set<string>();
        Object.values(disasterEventData.provenanceInfo).forEach((provInfo) => {
          sources.add(provInfo.provenanceUrl);
        });
        rankEventData(disasterEventData);
      })
      .catch(() => {
        setTopEvents(undefined);
      });
  }

  function rankEventData(disasterEventData: DisasterEventPointData) {
    disasterEventData.eventPoints.sort(
      (a, b) => a.severity[severityProp] - b.severity[severityProp]
    );
    const topEvents = disasterEventData.eventPoints.slice(0, RANKING_COUNT);
    setTopEvents(topEvents);
  }

  // function handleEmbed(
  //   e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  //   rankingPoints: RankingPoint[]
  // ): void {
  //   e.preventDefault();
  //   embedModalElement.current.show(
  //     "",
  //     rankingPointsToCsv(rankingPoints),
  //     chartContainer.current.offsetWidth,
  //     0,
  //     "",
  //     "",
  //     []
  //   );
  // }
}
