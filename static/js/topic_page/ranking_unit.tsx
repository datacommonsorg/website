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

import React from "react";

import { formatNumber, LocalizedLink } from "../i18n/i18n";
import { formatString } from "./string_utils";

const NUM_FRACTION_DIGITS = 2;

// TODO: move this as a general data type.
export interface Point {
  placeDcid: string;
  placeName?: string;
  value: number;
  /**
   * If not provided, the component will calculate the rank based on the order of the input points.
   */
  rank?: number;
}

interface RankingUnitPropType {
  title: string;
  points: Point[];
  /**
   * If true, rows are ordered from highest ranks to lowest, e.g., 1,2,3...
   * Otherwise, from lowest to highest, e.g., n,n-1,n-2,...
   */
  isHighest: boolean;
  unit?: string;
  scaling?: number;
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
}

export function RankingUnit(props: RankingUnitPropType): JSX.Element {
  // Calculates ranks based on the order of data if no rank is provided.
  function getRank(
    isHighest: boolean,
    index: number,
    numberOfTotalDataPoints?: number
  ): number {
    if (isHighest) {
      return index + 1;
    }
    return numberOfTotalDataPoints
      ? numberOfTotalDataPoints - index
      : index + 1;
  }

  return (
    <div className="ranking-list">
      <h4>{props.title}</h4>
      <table>
        <tbody>
          {props.points.map((point, i) => {
            return (
              <tr key={point.placeDcid}>
                <td
                  className={`rank ${
                    point.placeDcid === props.highlightedDcid ? "bold" : ""
                  }`}
                >
                  {point.rank
                    ? point.rank
                    : getRank(props.isHighest, i, props.numDataPoints)}
                  .
                </td>
                <td
                  className={`place-name ${
                    point.placeDcid === props.highlightedDcid ? "bold" : ""
                  }`}
                >
                  <LocalizedLink
                    href={`/place/${point.placeDcid}`}
                    text={point.placeName || point.placeDcid}
                  />
                </td>
                {!props.hideValue && (
                  <td className="stat">
                    <span
                      className={`num-value ${
                        point.placeDcid === props.highlightedDcid ? "bold" : ""
                      }`}
                    >
                      {formatNumber(
                        props.scaling
                          ? point.value * props.scaling
                          : point.value,
                        props.unit,
                        false,
                        NUM_FRACTION_DIGITS
                      )}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
