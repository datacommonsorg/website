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
import React, { useRef } from "react";

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
import { rankingPointsToCsv } from "../../utils/chart_csv_utils";
import { formatNumber } from "../../utils/string_utils";

const RANKING_COUNT = 10;

interface TopEventTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  topEventMetadata: TopEventTileSpec;
  eventTypeSpec: EventTypeSpec;
  disasterEventData: DisasterEventPointData;
  className?: string;
}

export function TopEventTile(props: TopEventTilePropType): JSX.Element {
  const embedModalElement = useRef<ChartEmbed>(null);
  const chartContainer = useRef(null);
  const severityFilter = props.eventTypeSpec.defaultSeverityFilter;
  const severityProp = severityFilter.prop;
  const severityDisplay = severityFilter.displayName || severityFilter.prop;
  const topEvents = rankEventData(props.disasterEventData, props.topEventMetadata.reverseSort);

  const displayPropNames = {};
  const displayPropUnits = {};
  if (props.topEventMetadata.displayProp) {
    for (const dp of props.topEventMetadata.displayProp) {
      for (const edp of props.eventTypeSpec.displayProp) {
        if (edp.prop == dp) {
          displayPropNames[dp] = edp.displayName;
          displayPropUnits[dp] = edp.unit;
          break;
        }
      }
    }
  }

  if (topEvents === undefined) {
    return <></>;
  }
  console.log(topEvents);

  return (
    <div
      className={`chart-container ranking-tile ${props.className}`}
      ref={chartContainer}
    >
      {_.isEmpty(topEvents) ? (
        <p>There were no severe events in that time period.</p>
      ) : (
        <div className="ranking-unit-container">
          <div className="ranking-list">
            <h4>{props.title}</h4>
            <table>
              <thead>
                <tr>
                  <td></td>
                  <td>Name</td>
                  {(props.topEventMetadata.showStartDate ||
                    props.topEventMetadata.showEndDate) && <td>Date</td>}
                  {props.topEventMetadata.displayProp &&
                  props.topEventMetadata.displayProp.map((dp, i) => (
                    <td key={i} className="stat">
                      {displayPropNames[dp]}
                    </td>
                  ))}
                  <td className="stat">{severityDisplay}</td>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((event, i) => {
                  return (
                    <tr key={i}>
                      <td className="rank">{i + 1}</td>
                      <td>
                        <a href={`/browser/${event.placeDcid}`}>
                          {isUnnamedEvent(event.placeName) ? "Unnamed event" : event.placeName}
                        </a>
                      </td>
                      {(props.topEventMetadata.showStartDate ||
                        props.topEventMetadata.showEndDate) && (
                        <td>
                          {props.topEventMetadata.showStartDate &&
                            event.startDate}
                          {props.topEventMetadata.showStartDate &&
                            props.topEventMetadata.showEndDate &&
                            "-"}
                          {props.topEventMetadata.showEndDate && event.endDate}
                        </td>
                      )}
                      {props.topEventMetadata.displayProp && props.topEventMetadata.displayProp.map((dp, i) => {
                        return (
                          <td key={i} className="stat">
                            {formatNumber(
                              event.displayProps[dp],
                              displayPropUnits[dp],
                              false
                            )}
                          </td>
                        );
                      })}
                      <td className="stat">
                        <span className="num-value">
                          {formatNumber(
                            event.severity[severityProp],
                            props.eventTypeSpec.defaultSeverityFilter.unit,
                            false
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <footer>
              <a
                href="#"
                onClick={(event) => {
                  handleEmbed(event, topEvents);
                }}
              >
                Export
              </a>
            </footer>
          </div>
        </div>
      )}
      <ChartEmbed ref={embedModalElement} />
    </div>
  );

  function rankEventData(
    disasterEventData: DisasterEventPointData,
    isReverse: boolean
  ): DisasterEventPoint[] {
    const filteredPoints = disasterEventData.eventPoints.filter(
      (a) => !_.isEmpty(a.severity)
    );
    filteredPoints.sort(
      (a, b) => {
        if (isReverse) {
        return a.severity[severityProp] - b.severity[severityProp]
        } else {
        return b.severity[severityProp] - a.severity[severityProp]
        }
      }
    );
    return filteredPoints.slice(0, RANKING_COUNT);
  }

  function handleEmbed(
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    topEvents: DisasterEventPoint[]
  ): void {
    e.preventDefault();
    const rankingPoints = topEvents.map((point) => {
      return {
        placeDcid: point.placeDcid,
        placename: point.placeName,
        value: point.severity[severityProp],
      };
    });
    embedModalElement.current.show(
      "",
      rankingPointsToCsv(rankingPoints),
      chartContainer.current.offsetWidth,
      0,
      "",
      "",
      []
    );
  }
}

function isUnnamedEvent(name: string) {
  return name.indexOf("started on") > 0 ||
  (name.indexOf("Event at") > 0 && name.indexOf(" on ") > 0);
}