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
 * Component that contains the content for the Stat Var Explorer.
 */

import React, { Component } from "react";

import { formatNumber } from "../../i18n/i18n";
import { StatVarSummary } from "../../shared/types";
import { Places } from "./places";
import { Provenance, ProvenancePropType } from "./provenance";

interface ExplorerPropType {
  description: string;
  displayName: string;
  statVar: string;
  summary: StatVarSummary;
  urls: Record<string, string>;
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
          </a>{" "}
          (Graph Browser)
        </h2>
        {this.props.description && (
          <h4 className="description-text">{this.props.description}</h4>
        )}
        {!this.props.summary && <div>No data available.</div>}
        {this.props.summary?.placeTypeSummary && (
          <h4 className="highlight-text">
            Total number of places:{" "}
            {formatNumber(this.getNumberOfPlaces(), undefined, true)}
          </h4>
        )}
        {this.props.summary?.provenanceSummary && (
          <h4 className="highlight-text">
            Total number of sources:{" "}
            {formatNumber(provenanceSummaryList.length, undefined, true)}
          </h4>
        )}
        {/* The only children passed in should be the stat var explorer button */}
        {this.props.children}
        {this.props.summary?.placeTypeSummary && (
          <div id="place-type-summary-section" className="table-page-section">
            <h3>Places</h3>
            <Places
              statVar={this.props.statVar}
              placeTypeSummary={this.props.summary.placeTypeSummary}
            />
          </div>
        )}
        {this.props.summary?.provenanceSummary && (
          <div id="provenance-summary-section" className="table-page-section">
            <h3>Sources</h3>
            {provenanceSummaryList.map((element) => {
              const url =
                element.provId in this.props.urls
                  ? this.props.urls[element.provId]
                  : "";
              return (
                <Provenance
                  provId={element.provId}
                  summary={element.summary}
                  url={url}
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
    if (!this.props.summary) {
      return [];
    }
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
    if (!this.props.summary?.placeTypeSummary) {
      return 0;
    }
    let count = 0;
    for (const placeType in this.props.summary.placeTypeSummary) {
      count += Number(
        this.props.summary.placeTypeSummary[placeType].placeCount
      );
    }
    return count;
  }
}

export { Explorer };
