/**
 * Copyright 2021 Google LLC
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
 * Places table component for Stat Var Explorer.
 */

import React, { Component } from "react";

import { formatNumber } from "../../i18n/i18n";
import { PlaceTypeSummary } from "../../shared/types";

interface PlacesPropType {
  statVar: string;
  placeTypeSummary: { [placeType: string]: PlaceTypeSummary };
}

interface FlatPlaceTypeSummary {
  placeType: string;
  summary: PlaceTypeSummary;
}

class Places extends Component<PlacesPropType, unknown> {
  render(): JSX.Element {
    const placeTypeSummaryList = this.flattenPlaceTypeSummary();
    return (
      <div className="card p-0">
        <table className="node-table">
          <tbody>
            <tr key="header">
              <th className="type-column">Type</th>
              <th className="number-column">Count</th>
              <th>Example Places</th>
            </tr>
            {placeTypeSummaryList.map((element) => {
              return (
                <tr key={element.placeType}>
                  <td className="type-column">{element.placeType}</td>
                  <td className="number-column">
                    {formatNumber(element.summary.placeCount, true)}
                  </td>
                  <td>
                    {element.summary.topPlaces.map((place, index) => {
                      const url =
                        "/tools/timeline#" +
                        `statsVar=${this.props.statVar}&place=${place.dcid}`;
                      const name = place.name || place.dcid;
                      const delimiter =
                        index < element.summary.topPlaces.length - 1
                          ? ", "
                          : "";
                      return (
                        <span key={place.dcid}>
                          <a href={url} target="_blank" rel="noreferrer">
                            {name}
                          </a>
                          {delimiter}
                        </span>
                      );
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  private flattenPlaceTypeSummary(): Array<FlatPlaceTypeSummary> {
    const placeTypeSummaryList = [];
    for (const placeType in this.props.placeTypeSummary) {
      placeTypeSummaryList.push({
        placeType,
        summary: this.props.placeTypeSummary[placeType],
      });
    }
    placeTypeSummaryList.sort(function (
      a: FlatPlaceTypeSummary,
      b: FlatPlaceTypeSummary
    ): number {
      return a.placeType.localeCompare(b.placeType);
    });
    return placeTypeSummaryList;
  }
}

export { Places };
