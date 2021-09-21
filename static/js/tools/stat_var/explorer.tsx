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
import { Place } from "./place";
import { Provenance, ProvenancePropType } from "./provenance";
import { StatVarSummary } from "../../shared/types";

interface ExplorerPropType {
  displayName: string;
  statVar: string;
  summary: StatVarSummary;
}

class Explorer extends Component<ExplorerPropType, unknown> {
  render(): JSX.Element {
    const provenanceSummaryList = this.flattenProvenanceSummary();
    return (
      <div id="stat-var-explorer">
        <h1>{this.props.displayName}</h1>
        <h2>
          dcid:{" "}
          <a
            href={`/browser/${this.props.statVar}`}
            target="_blank"
            rel="noreferrer"
          >
            {this.props.statVar}
          </a>
        </h2>
        {!this.props.summary && <div>No data available.</div>}
        {this.props.summary?.placeTypeSummary && (
          <h4 className="highlight-text">
            Total number of places: {this.getNumberOfPlaces()}
          </h4>
        )}
        {this.props.summary?.provenanceSummary && (
          <h4 className="highlight-text">
            Total number of sources: {provenanceSummaryList.length}
          </h4>
        )}
        {this.props.summary?.placeTypeSummary && (
          <div id="place-type-summary-section" className="browser-page-section">
            <h3>Places</h3>
            <Place
              statVar={this.props.statVar}
              placeTypeSummary={this.props.summary.placeTypeSummary}
            />
          </div>
        )}
        {this.props.summary?.provenanceSummary && (
          <div id="provenance-summary-section" className="browser-page-section">
            <h3>Sources</h3>
            {provenanceSummaryList.map((element) => {
              return (
                <Provenance
                  provId={element.provId}
                  summary={element.summary}
                  key={element.provId}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  private flattenProvenanceSummary(): Array<ProvenancePropType> {
    if (!this.props.summary) return [];
    const provenanceSummaryList = [];
    for (const provId in this.props.summary.provenanceSummary) {
      provenanceSummaryList.push({
        provId,
        summary: this.props.summary.provenanceSummary[provId],
      });
    }
    provenanceSummaryList.sort(function (
      a: ProvenancePropType,
      b: ProvenancePropType
    ): number {
      return a.summary.importName.localeCompare(b.summary.importName);
    });
    return provenanceSummaryList;
  }

  private getNumberOfPlaces(): number {
    if (!this.props.summary?.placeTypeSummary) return 0;
    let count = 0;
    for (const placeType in this.props.summary.placeTypeSummary) {
      count += Number(this.props.summary.placeTypeSummary[placeType].numPlaces);
    }
    return count;
  }
}

export { Explorer };
