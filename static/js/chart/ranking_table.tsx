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
import { formatString } from "../topic_page/string_utils";

const NUM_FRACTION_DIGITS = 2;

export interface Point {
  dcid: string;
  label: string;
  value: number;
  /**
   * If not provided, the component will calculate the rank based on the order of the input points.
   */
  rank?: number;
  /**
   * Redirect link on the label. If not provided, the label will be in plain text.
   */
  redirectLink?: string;
}

interface RankingTablePropType {
  title: string;
  /**
   * All the provided points will appear in the table as rows.
   */
  points: Point[];
  /**
   * If true, rows are ordered from highest ranks to lowest, e.g., 1,2,3...
   * Otherwise, from lowest to highest, e.g., n,n-1,n-2,...
   */
  isHighest: boolean;
  statVarName?: string;
  unit?: string;
  scaling?: number;
  /**
   * Total number of points. This is used for calculating ranks if isHighest is false
   * (ordering from lowest ranks to highest) and ranks are not provided, e.g., n,n-1,n-2,...
   */
  numDataPoints?: number;
  /**
   * The row with dcid equal to currentDcid will be bolded.
   */
  currentDcid?: string;
  /**
   * If true, only the ranks and labels will be shown and not the values.
   */
  notShowValue?: boolean;
}

export function RankingTable(props: RankingTablePropType): JSX.Element {
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
    <div className="ranking-table">
      <h4>
        {formatString(props.title, {
          date: "",
          place: "",
          statVar: props.statVarName,
        })}
      </h4>
      <table>
        <tbody>
          {props.points.map((point, i) => {
            return (
              <tr key={point.dcid}>
                <td
                  className={`rank ${
                    point.dcid === props.currentDcid ? "bold" : ""
                  }`}
                >
                  {point.rank
                    ? getRank(props.isHighest, i, props.numDataPoints)
                    : point.rank}
                  .
                </td>
                <td
                  className={`label ${
                    point.dcid === props.currentDcid ? "bold" : ""
                  }`}
                >
                  {point.redirectLink ? (
                    point.label || point.dcid
                  ) : (
                    <LocalizedLink
                      href={point.redirectLink}
                      text={point.label || point.dcid}
                    />
                  )}
                </td>
                {!props.notShowValue && (
                  <td
                    className={`value ${
                      point.dcid === props.currentDcid ? "bold" : ""
                    }`}
                  >
                    {formatNumber(
                      props.scaling ? point.value * props.scaling : point.value,
                      props.unit,
                      false,
                      NUM_FRACTION_DIGITS
                    )}
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
