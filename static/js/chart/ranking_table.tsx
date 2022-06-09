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

import { throttle } from "lodash";
import React, { useEffect, useState } from "react";

import { formatNumber, LocalizedLink } from "../i18n/i18n";
import { statVarSep } from "../tools/timeline/util";
import { formatString } from "../topic_page/string_utils";

const NUM_FRACTION_DIGITS = 2;

export interface Point {
    dcid: string;
    label: string;
    value: number;
    rank?: number //  If not provided, the component will calculate the rank base on the sequence of the input data.
    redirectLink?: string // Add redirect link on the label. If not provided, the label will be in text.
}

interface RankingTablePropType {
    title: string;
    points: Point[];
    isHighest: boolean; // Show the highest rank or the lowest rank. 
    statVarName?: string; // Show the statVarName in the title.
    unit?: string;
    scaling?: number;
    numDataPoints?: number;// Calculate the rank for the lowest, starting from n, n-1,n-2. If not provided, the default rank will be 1,2,3...
    currentDcid?: string; // Bold the entire row when the place in the rank is the current place.
    notShowValue?: boolean; // False if do not want to show the value.
}

export function RankingTable(props: RankingTablePropType): JSX.Element {
    // Calculate the rank based on the sequece of data if no rank is provided.
    function getRank(isHighest: boolean, index: number, numberOfTotalDataPoints?: number): number {
        if (isHighest) {
            return index + 1;
        }
        return numberOfTotalDataPoints ? numberOfTotalDataPoints - index : index + 1;
    }

    return (
        <div className="ranking-table">
            <h4>
                {formatString(props.title, {
                    place: "",
                    date: "",
                    statVar: props.statVarName,
                })}
            </h4>
            <table>
                <tbody>
                    {props.points.map((point, i) => {
                        return (
                            <tr key={point.dcid}>
                                <td className={`rank ${point.dcid === props.currentDcid ? "bold" : ""}`}>
                                    {point.rank === undefined ? getRank(props.isHighest, i, props.numDataPoints) : point.rank}.
                                </td>
                                <td className={`label ${point.dcid === props.currentDcid ? "bold" : ""}`}>
                                    {point.redirectLink === undefined ?
                                        point.label || point.dcid :
                                        <LocalizedLink
                                            href={point.redirectLink}
                                            text={point.label || point.dcid}
                                        />}
                                </td>
                                {(props.notShowValue === undefined || !props.notShowValue) &&
                                    <td className={`value ${point.dcid === props.currentDcid ? "bold" : ""}`}>
                                        {formatNumber(
                                            props.scaling ? point.value * props.scaling : point.value,
                                            props.unit,
                                            false,
                                            NUM_FRACTION_DIGITS
                                        )}
                                    </td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div >
    );
}
