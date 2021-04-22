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
import { ImageSection } from "./image_section";
import { ObservationChartSection } from "./observation_chart_section";
import { StatVarHierarchy } from "./statvar_hierarchy";
import { PageDisplayType } from "./util";
import { WeatherChartSection } from "./weather_chart_section";

const URL_PREFIX = "/browser/";

interface BrowserPagePropType {
  dcid: string;
  nodeName: string;
  pageDisplayType: PageDisplayType;
  statVarId: string;
  nodeType: string;
}

export class BrowserPage extends React.Component<BrowserPagePropType> {
  render(): JSX.Element {
    const arcDcid = this.getArcDcid();
    return (
      <>
        <div className="browser-page-header">
          {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR && (
            <div className="browser-header-title">
              Statistical Variable:
              <a href={URL_PREFIX + this.props.statVarId}>
                {" " + this.props.statVarId}
              </a>
            </div>
          )}
          <div className="browser-header-title">
            About:
            {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR ? (
              <a href={URL_PREFIX + this.props.dcid}>
                {" " + this.props.nodeName}
              </a>
            ) : (
              <span>{" " + this.props.nodeName}</span>
            )}
          </div>
          {this.props.pageDisplayType !== PageDisplayType.PLACE_STAT_VAR && (
            <>
              <div className="browser-header-subtitle">
                {"dcid: " + this.props.dcid}
              </div>
              <div className="browser-header-subtitle">
                {"typeOf: " + this.props.nodeType}
              </div>
            </>
          )}
        </div>
        <div id="node-content">
          <ArcSection
            dcid={arcDcid}
            nodeName={this.props.nodeName}
            displayInArcs={
              this.props.pageDisplayType !== PageDisplayType.PLACE_STAT_VAR
            }
            pageDisplayType={this.props.pageDisplayType}
          />
          {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR && (
            <div className="browser-page-section">
              <h3>{`Observations for ${this.props.nodeName}`}</h3>
              <ObservationChartSection
                placeDcid={this.props.dcid}
                statVarId={this.props.statVarId}
                placeName={this.props.nodeName}
              />
            </div>
          )}
          {this.props.pageDisplayType ===
            PageDisplayType.PLACE_WITH_WEATHER_INFO && (
            <div className="browser-page-section">
              <h3>Weather Observations</h3>
              <WeatherChartSection dcid={this.props.dcid} />
            </div>
          )}
          {this.props.pageDisplayType ===
            PageDisplayType.BIOLOGICAL_SPECIMEN && (
            <div className="browser-page-section">
              <h3>Image</h3>
              <ImageSection dcid={this.props.dcid} />
            </div>
          )}
          {this.props.pageDisplayType !== PageDisplayType.PLACE_STAT_VAR && (
            <StatVarHierarchy
              dcid={this.props.dcid}
              placeName={this.props.nodeName}
            />
          )}
        </div>
      </>
    );
  }

  private getArcDcid(): string {
    return this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR
      ? this.props.statVarId
      : this.props.dcid;
  }
}
