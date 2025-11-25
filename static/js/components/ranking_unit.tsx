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
import { Spinner } from "reactstrap";

import { useLazyLoad } from "../shared/hooks";
import { RankingUnitUrlFuncContext } from "../../js/shared/context";
import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { formatNumber, LocalizedLink } from "../i18n/i18n";
import { RankingPoint } from "../types/ranking_unit_types";
import { PlaceName } from "./place_name";

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
  errorMsg?: string;
  apiRoot?: string;
  entityType?: string;
  isLoading?: boolean;
  statVar?: string;
  enableScroll?: boolean;
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

/**
 * Gets list of list of points to show where each list will be separated by ...
 * and each point will have the rank set.
 * @param topPoints list of top points (first list of points) to show
 * @param bottomPoints list of bottom points (second list of points) to show
 * @param isHighest whether or not the points are shown as highest to lowest or
 *                  the other way around
 * @param numDataPoints total number of points in the data.
 */
export function getPointsList(
  topPoints: RankingPoint[],
  bottomPoints: RankingPoint[],
  isHighest: boolean,
  numDataPoints?: number
): RankingPoint[][] {
  const pointsList = [
    topPoints.map((point, idx) => {
      return {
        ...point,
        rank: point.rank || getRank(isHighest, idx, numDataPoints),
      };
    }),
  ];
  if (!_.isEmpty(bottomPoints)) {
    const startIdx =
      (numDataPoints || bottomPoints.length) - bottomPoints.length;
    pointsList.push(
      bottomPoints.map((point, idx) => {
        return {
          ...point,
          rank: point.rank || getRank(isHighest, startIdx + idx, numDataPoints),
        };
      })
    );
  }
  return pointsList;
}

function RankingRow(props: {
  point: RankingPoint;
  highlightedDcid?: string;
  entityType?: string;
  apiRoot?: string;
  onHoverToggled?: (placeDcid: string, hover: boolean) => void;
  hideValue?: boolean;
  scaling?: number[];
  unit?: string[];
  svNames?: string[];
  eagerLoad?: boolean;
}): JSX.Element {
  const {
    point,
    highlightedDcid,
    entityType,
    apiRoot,
    onHoverToggled,
    hideValue,
    scaling,
    unit,
    eagerLoad,
  } = props;
  const { shouldLoad: lazyShouldLoad, containerRef } = useLazyLoad<HTMLTableRowElement>("200px");
  const urlFunc = React.useContext(RankingUnitUrlFuncContext);
  const shouldLoad = eagerLoad || lazyShouldLoad;

  return (
    <tr ref={containerRef}>
      <td
        className={`rank ${point.placeDcid === highlightedDcid ? "bold" : ""}`}
      >
        {point.rank}.
      </td>
      <td
        className={`place-name ${
          point.placeDcid === highlightedDcid ? "bold" : ""
        }`}
      >
        <LocalizedLink
          href={urlFunc(point.placeDcid, entityType, apiRoot)}
          text={
            point.placeName ? (
              point.placeName
            ) : shouldLoad ? (
              <PlaceName dcid={point.placeDcid} apiRoot={apiRoot} />
            ) : (
              <Spinner color="secondary" size="sm" />
            )
          }
          onMouseEnter={() =>
            onHoverToggled && onHoverToggled(point.placeDcid, true)
          }
          onMouseLeave={() =>
            onHoverToggled && onHoverToggled(point.placeDcid, false)
          }
        />
      </td>
      {!hideValue && _.isEmpty(point.values) && (
        <td className="stat">
          <span
            className={`num-value ${
              point.placeDcid === highlightedDcid ? "bold" : ""
            }`}
          >
            {formatNumber(
              !_.isEmpty(scaling) && scaling[0]
                ? point.value * scaling[0]
                : point.value,
              unit && unit.length ? unit[0] : ""
            )}
          </span>
        </td>
      )}
      {!hideValue &&
        !_.isEmpty(point.values) &&
        point.values.map((v, i) => (
          <td key={i} className="stat">
            <span
              className={`num-value ${
                point.placeDcid === highlightedDcid ? "bold" : ""
              }`}
            >
              {formatNumber(
                !_.isEmpty(scaling) && scaling[i] ? v * scaling[i] : v,
                unit && unit.length ? unit[i] : ""
              )}
            </span>
          </td>
        ))}
      <td className="ranking-date-cell" title={point.date}>
        {point.date}
      </td>
    </tr>
  );
}

export function RankingUnit(props: RankingUnitPropType): JSX.Element {
  const urlFunc = useContext(RankingUnitUrlFuncContext);
  const pointsList = getPointsList(
    props.topPoints,
    props.bottomPoints,
    props.isHighest,
    props.numDataPoints
  );
  return (
    <div
      className={"ranking-list " + ASYNC_ELEMENT_CLASS}
      ref={props.forwardRef}
    >
      <div className="ranking-header-section">
        <h4>
          {props.isLoading ? (
            <Spinner color="secondary" size="sm" className="mr-1" />
          ) : null}
          {props.title}
        </h4>
        {props.headerChild}
      </div>
      {props.errorMsg ? (
        <div>{props.errorMsg}</div>
      ) : props.enableScroll ? (
          <div
            className="ranking-scroll-container"
            style={{ maxHeight: "400px", overflowY: "auto" }}
          >
          <table>
            {props.svNames && !props.hideValue && (
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "white",
                  zIndex: 1,
                }}
              >
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
                    {points.map((point, i) => {
                      return (
                        <RankingRow
                          key={point.placeDcid}
                          point={point}
                          {...props}
                          eagerLoad={idx === 0 && i < 20}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
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
                  {points.map((point, i) => {
                    return (
                      <RankingRow
                        key={point.placeDcid}
                        point={point}
                        {...props}
                        eagerLoad={idx === 0 && i < 20}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
