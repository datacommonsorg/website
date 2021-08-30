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

import React, { Component } from "react";
import { StatVarSummary } from "../../shared/types";

interface ExplorerPropType {
  displayName: string;
  statVar: string;
  summary: StatVarSummary;
}

interface PlaceTypeSummaryList {
  listElement: HTMLElement,
  numPlaces: number,
  placeType: string,
}

class Explorer extends Component<ExplorerPropType, unknown> {
  render(): JSX.Element {
    const placeTypeSummaryList = this.createPlaceTypeSummaryList();
    return (
      <div id="placeholder-container">
        <h1 className="mb-4">{this.props.displayName}</h1>
        <p>
          dcid: {this.props.statVar}
          <br></br>
          <a href={`/browser/${this.props.statVar}`}>
            Graph Browser node
          </a>
        </p>
        This statistical variable has observations for the following places:
        <ul>
          {placeTypeSummaryList.map((element) => {
            return element.listElement;
          })}
        </ul>
      </div>
    );
  }

  private createPlaceTypeSummaryList(): Array<PlaceTypeSummaryList> {
    const placeTypeSummaryList = [];
    const placeTypeSummary = this.props.summary["placeTypeSummary"];
    for (const placeType in placeTypeSummary) {
      const numPlaces = placeTypeSummary[placeType]["numPlaces"];
      const subject = numPlaces > 1 ? "places" : "place";
      const message = `${numPlaces} ${subject} of type ${placeType}`;
      const topPlaces = placeTypeSummary[placeType]["topPlaces"];
      placeTypeSummaryList.push({
        listElement: <li key={placeType}>
          {message} (e.g.{" "}
          {topPlaces.map((element, index) => {
            const url =
              `/tools/timeline#statsVar=${this.props.statVar}&place=${element["dcid"]}`;
            const name = element["name"] || element["dcid"];
            const delimiter = index < topPlaces.length - 1 ? ", " : "";
            return (
              <span key={element["dcid"]}>
                <a href={url}>{name}</a>
                {delimiter}
              </span>
            );
          })}
          )
        </li>,
      numPlaces,
      placeType,
      });
    }
    placeTypeSummaryList.sort(function (a, b): number {
      return b.numPlaces - a.numPlaces || a.placeType.localeCompare(b.placeType);
    });
    return placeTypeSummaryList;
  }
}

export { Explorer };
