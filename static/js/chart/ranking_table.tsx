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

// Change the point type to general data type. Referenced to the class dataPoint in base.ts. Do not need dataGroup?
export interface Point {
    dcid: string;
    label: string; // indicate what the value is for. Could be a place name or date string
    value: number;
    rank?: number // Already have the rank
    redirectLink?: string
}
// slice the dps before pass to the props
interface RankingTablePropType {
    title: string;
    points: Point[];
    statVarName?: string; // may not need the statVarName in the title
    unit?: string;
    scaling?: number;
    numDataPoints?: number;// if not provided and no rank, for the lowest ranking, the rank will be 1,2,3,4..., start from the lowest value
    isHighest: boolean; // True if the table is for the highest ranking. False if the table is for the lowest ranking.
    currentDcid?: string; // Bold the row if it is the current place
}

const WINDOW_BREAKPOINT = 992;
export function RankingTable(props: RankingTablePropType): JSX.Element {
    // Not show the value if the window size is less than the breakpoint
    const [shouldShowValue, setShouldShowValue] = useState(window.innerWidth >= WINDOW_BREAKPOINT ? true : false);
    useEffect(() => {
        function handleWindowResize() {
            console.log(shouldShowValue)
            if (window.innerWidth < WINDOW_BREAKPOINT && shouldShowValue) {
                setShouldShowValue(false);
            } else if (window.innerWidth >= WINDOW_BREAKPOINT && !shouldShowValue) {
                setShouldShowValue(true);
            }
        };
        window.addEventListener("resize", handleWindowResize)
        return () => { window.removeEventListener("resize", handleWindowResize) }
    })
    // 
    function getRank(isHighest: boolean, index: number, numberOfTotalDataPoints?: number): number {
        if (isHighest) {
            return index + 1
        }
        return numberOfTotalDataPoints ? numberOfTotalDataPoints - index : index + 1
    }

    return (
        <div className="ranking_table">
            {/* //????what is formatString doing? */}
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
                                <td className="rank">
                                    <span className={point.dcid === props.currentDcid ? "rank-bold" : "rank-normal"}>{point.rank === undefined ? getRank(props.isHighest, i, props.numDataPoints) : point.rank}.</span>
                                </td>
                                <td className={"label"}>
                                    <span className={point.dcid === props.currentDcid ? "label-bold" : "label-normal"}>{point.redirectLink === undefined ?
                                        point.label || point.dcid :
                                        <LocalizedLink
                                            href={point.redirectLink}
                                            text={point.label || point.dcid}
                                        />}
                                    </span>
                                </td>
                                {shouldShowValue &&
                                    <td className="value">
                                        <span className={point.dcid === props.currentDcid ? "rank-bold" : "rank-normal"}>{formatNumber(
                                            props.scaling ? point.value * props.scaling : point.value,
                                            props.unit,
                                            false,
                                            NUM_FRACTION_DIGITS
                                        )}
                                        </span>
                                    </td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
