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
 * Component for rendering a single ranking list.
 */

import _ from "lodash";
import React, { RefObject, useContext } from "react";

import { RankingUnitUrlFuncContext } from "../../js/shared/context";
import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { formatNumber, LocalizedLink } from "../i18n/i18n";
import { RankingPoint } from "../types/ranking_unit_types";

interface RankingUnitPropType {
  title: string;
  /**
   * If true, rows are ordered from highest ranks to lowest, e.g., 1,2,3...
   * Otherwise, from lowest to highest, e.g., n,n-1,n-2,...
   */
  isHighest: boolean;
  /**
   * List of top points to show in the ranking unit.
   */
  topPoints: RankingPoint[];
  /**
   * List of bottom points to show in the ranking unit. These points will be
   * separated from topPoints with ...
   */
  bottomPoints?: RankingPoint[];
  unit?: string[];
  /**
   * React ref for outermost div of this element
   */
  forwardRef?: RefObject<HTMLDivElement>;
  scaling?: number[];
  /**
   * Total number of points. This is used for calculating ranks if isHighest is false
   * (ordering from lowest ranks to highest) and ranks are not provided, e.g., n,n-1,n-2,...
   */
  numDataPoints?: number;
  /**
   * The row with the dcid will be bolded.
   */
  highlightedDcid?: string;
  /**
   * If true, only the ranks and labels will be shown and not the values.
   */
  hideValue?: boolean;
  /**
   * For multi-column, these are the display strings for the value columns, in order.
   * TODO: Add better support for multi-column by adding a single list of columns:
   *       columns: { unt: string; scaling: number; name: string }[];
   */
  svNames?: string[];
  /**
   * Callback function to handle when mouse hovers over an item or when it stops
   * hovering over the item.
   */
  onHoverToggled?: (placeDcid: string, hover: boolean) => void;
  headerChild?: React.ReactNode;
}

// Calculates ranks based on the order of data if no rank is provided.
function getRank(
  isHighest: boolean,
  index: number,
  numberOfTotalDataPoints?: number
): number {
  if (isHighest) {
    return index + 1;
  }
  return numberOfTotalDataPoints ? numberOfTotalDataPoints - index : index + 1;
}

// Gets list of list of points to show where each list will be separated by ...
// and each point will have the rank set.
function getPointsList(props: RankingUnitPropType): RankingPoint[][] {
  const pointsList = [
    props.topPoints.map((point, idx) => {
      return {
        ...point,
        rank: point.rank || getRank(props.isHighest, idx, props.numDataPoints),
      };
    }),
  ];
  if (!_.isEmpty(props.bottomPoints)) {
    const startIdx =
      (props.numDataPoints || props.bottomPoints.length) -
      props.bottomPoints.length;
    pointsList.push(
      props.bottomPoints.map((point, idx) => {
        return {
          ...point,
          rank:
            point.rank ||
            getRank(props.isHighest, startIdx + idx, props.numDataPoints),
        };
      })
    );
  }
  return pointsList;
}

export function RankingUnit(props: RankingUnitPropType): JSX.Element {
  const urlFunc = useContext(RankingUnitUrlFuncContext);
  const pointsList = getPointsList(props);

  return (
    <div
      className={"ranking-list " + ASYNC_ELEMENT_CLASS}
      ref={props.forwardRef}
    >
      <div className="ranking-header-section">
        <h4>{props.title}</h4>
        {props.headerChild}
      </div>
      <table>
        {props.svNames && !props.hideValue && (
          <thead>
            <tr>
              <td></td>
              <td></td>
              {props.svNames.map((name, i) => (
                <td key={i} className="stat">
                  {name}
                </td>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {pointsList.map((points, idx) => {
            return (
              <React.Fragment key={`ranking-unit-list-${idx}`}>
                {idx > 0 && (
                  <tr>
                    <td>...</td>
                  </tr>
                )}
                {points.map((point) => {
                  return (
                    <tr key={point.placeDcid}>
                      <td
                        className={`rank ${
                          point.placeDcid === props.highlightedDcid
                            ? "bold"
                            : ""
                        }`}
                      >
                        {point.rank}.
                      </td>
                      <td
                        className={`place-name ${
                          point.placeDcid === props.highlightedDcid
                            ? "bold"
                            : ""
                        }`}
                      >
                        <LocalizedLink
                          href={urlFunc(point.placeDcid)}
                          text={point.placeName || point.placeDcid}
                          onMouseEnter={() => {
                            if (!props.onHoverToggled) {
                              return;
                            }
                            props.onHoverToggled(point.placeDcid, true);
                          }}
                          onMouseLeave={() => {
                            if (!props.onHoverToggled) {
                              return;
                            }
                            props.onHoverToggled(point.placeDcid, false);
                          }}
                        />
                      </td>
                      {!props.hideValue && _.isEmpty(point.values) && (
                        <td className="stat">
                          <span
                            className={`num-value ${
                              point.placeDcid === props.highlightedDcid
                                ? "bold"
                                : ""
                            }`}
                          >
                            {formatNumber(
                              !_.isEmpty(props.scaling) && props.scaling[0]
                                ? point.value * props.scaling[0]
                                : point.value,
                              props.unit && props.unit.length
                                ? props.unit[0]
                                : ""
                            )}
                          </span>
                        </td>
                      )}
                      {!props.hideValue &&
                        !_.isEmpty(point.values) &&
                        point.values.map((v, i) => (
                          <td key={i} className="stat">
                            <span
                              className={`num-value ${
                                point.placeDcid === props.highlightedDcid
                                  ? "bold"
                                  : ""
                              }`}
                            >
                              {formatNumber(
                                !_.isEmpty(props.scaling) && props.scaling[i]
                                  ? v * props.scaling[i]
                                  : v,
                                props.unit && props.unit.length
                                  ? props.unit[i]
                                  : ""
                              )}
                            </span>
                          </td>
                        ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
