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
  stat: number;
}

interface RankingUnitPropType {
  title: string;
  points: Point[];
  statVarName: string;
  unit?: string;
  scaling?: number;
}

export function RankingUnit(props: RankingUnitPropType): JSX.Element {
  return (
    <div className="ranking-list">
      <h4>{formatString(props.title, {place: "", date: "", statVar: props.statVarName})}</h4>
      <table>
        <tbody>
          {props.points.map((point, i) => {
            return (
              <tr key={point.placeDcid}>
                <td className="rank">{i + 1}.</td>
                <td className="place-name">
                  <LocalizedLink
                    href={`/place/${point.placeDcid}`}
                    text={point.placeName || point.placeDcid}
                  />
                </td>
                <td className="stat">
                  <span className="num-value">
                    {formatNumber(
                      props.scaling ? point.stat * props.scaling : point.stat,
                      props.unit,
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
    </div>
  );
}
