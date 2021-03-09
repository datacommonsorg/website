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
interface BrowserPagePropType {
  dcid: string;
  nodeName: string;
  isPlaceStatVarNode: boolean;
  statVarId: string;
}

export class BrowserPage extends React.Component<BrowserPagePropType> {
  render(): JSX.Element {
    const pageName = this.props.isPlaceStatVarNode
      ? this.props.statVarId + " in " + this.props.nodeName
      : this.props.nodeName;
    return (
      <>
        <div className="node-about">{"About: " + pageName}</div>
        <div id="node-content">
          {this.props.isPlaceStatVarNode ? (
            <ObservationChartSection
              placeDcid={this.props.dcid}
              statVarId={this.props.statVarId}
              placeName={this.props.nodeName}
            />
          ) : (
            <ArcSection dcid={this.props.dcid} nodeName={this.props.nodeName} />
          )}
        </div>
      </>
    );
  }
}
