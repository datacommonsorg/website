/**
 * Copyright 2020 Google LLC
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

import React from "react";

import { PageHighlight } from "../chart/types";
import { GoogleMap } from "../components/google_map";
import { ASYNC_ELEMENT_HOLDER_CLASS } from "../constants/css_constants";
import { PlaceHighlight } from "./place_highlight";
import { PlaceSummary } from "./place_summary";
import { Ranking } from "./ranking";

interface OverviewPropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The locale of the page.
   */
  locale: string;
  /**
   * Whether to show ranking.
   */
  showRanking: boolean;
  /**
   * Data to highlight in the tile.
   */
  highlight?: PageHighlight;
  /**
   * Mapping of DCID -> place names to show
   */
  names?: { [key: string]: string };
  /**
   * Type of place, e.g. State, County
   */
  placeType?: string;
  /**
   * Text summary of the place
   */
  summaryText?: string;
}

class Overview extends React.Component<OverviewPropType> {
  render(): JSX.Element {
    return (
      <section
        className={`factoid col-12 ${
          this.props.showRanking && `overview-with-ranking`
        }`}
      >
        <div className="overview-tile">
          {this.props.summaryText && (
            <div className="row">
              <div className="col-12">
                <PlaceSummary summary={this.props.summaryText} />
              </div>
            </div>
          )}
          <div className="row">
            <div className={`col-12 ${this.props.showRanking && "col-md-4"}`}>
              <GoogleMap dcid={this.props.dcid}></GoogleMap>
            </div>
            {this.props.showRanking && (
              <div className={`col-12 col-md-8 ${ASYNC_ELEMENT_HOLDER_CLASS}`}>
                <Ranking
                  dcid={this.props.dcid}
                  locale={this.props.locale}
                ></Ranking>
              </div>
            )}
          </div>
          {this.props.highlight && (
            <>
              <hr />
              <div
                id="place-highlight-in-overview"
                className="place-highlight-container"
              >
                <PlaceHighlight
                  dcid={this.props.dcid}
                  highlight={this.props.highlight}
                />
              </div>
            </>
          )}
        </div>
      </section>
    );
  }
}

export { Overview };
