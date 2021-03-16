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

/**
 * Main component for browser2.
 */

import React from "react";
import { ArcSection } from "./arc_section";
import { ObservationChartSection } from "./observation_chart_section";
import { PageDisplayType } from "./util";
import { WeatherChartSection } from "./weather_chart_section";

interface BrowserPagePropType {
  dcid: string;
  nodeName: string;
  pageDisplayType: PageDisplayType;
  statVarId: string;
}

export class BrowserPage extends React.Component<BrowserPagePropType> {
  render(): JSX.Element {
    const pageTitle = this.getPageTitle();
    const arcDcid = this.getArcDcid();
    return (
      <>
        <div className="node-about">{"About: " + pageTitle}</div>
        <div id="node-content">
          <ArcSection
            dcid={arcDcid}
            nodeName={this.props.nodeName}
            displayInArcs={this.props.pageDisplayType !== PageDisplayType.PLACE_STAT_VAR}
          />
          {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR ? (
            <ObservationChartSection
              placeDcid={this.props.dcid}
              statVarId={this.props.statVarId}
              placeName={this.props.nodeName}
            />
          ) : null}
          {this.props.pageDisplayType ===
          PageDisplayType.PLACE_WITH_WEATHER_INFO ? (
            <WeatherChartSection dcid={this.props.dcid} />
          ) : null}
        </div>
      </>
    );
  }

  private getPageTitle(): string {
    return this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR
      ? `${this.props.statVarId} in ${this.props.nodeName}`
      : this.props.nodeName;
  }

  private getArcDcid(): string {
    return this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR
      ? this.props.statVarId
      : this.props.dcid;
  }
}
