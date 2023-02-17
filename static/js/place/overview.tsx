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

import axios from "axios";
import _ from "lodash";
import React from "react";

import { GoogleMap } from "../components/google_map";
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
}

/**
 * Holds response of /api/place/ranking, used to populate a ranking table.
 */
interface OverviewStateType {
  rankingData: {
    label: string[];
    Population: { name: Record<string, unknown>; label: string }[];
  };
}
class Overview extends React.Component<OverviewPropType, OverviewStateType> {
  constructor(props: OverviewPropType) {
    super(props);
    this.state = {
      rankingData: { label: [], Population: [] },
    };
  }

  render(): JSX.Element {
    return (
      <section className="factoid col-12">
        <div className="row">
          <div
            className={`col-12 ${this.shouldShowRanking() ? "col-md-4" : ""}`}
          >
            <div className={this.shouldShowRanking() ? "map-with-margin" : ""}>
              <GoogleMap dcid={this.props.dcid}></GoogleMap>
            </div>
          </div>
          {this.shouldShowRanking() ? (
            <>
              <div className="col-12 col-md-8">
                <Ranking
                  dcid={this.props.dcid}
                  locale={this.props.locale}
                  data={this.state.rankingData}
                ></Ranking>
              </div>
            </>
          ) : (
            <></>
          )}
        </div>
      </section>
    );
  }

  componentDidMount(): void {
    axios
      .get(`/api/place/ranking/${this.props.dcid}?hl=${this.props.locale}`)
      .then((resp) => {
        this.setState({ rankingData: resp.data });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  shouldShowRanking(): boolean {
    return !_.isEmpty(this.state.rankingData.label);
  }
}

export { Overview };
