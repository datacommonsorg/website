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
 * Component for rendering a stat var node in the stat var hierarchy.
 */

import React from "react";
import { StatVarNodeType, StatVarHierarchyNodeType } from "./util";
import { StatVarHierarchyNodeHeader } from "./statvar_group_node";
import Collapsible from "react-collapsible";
import { ObservationChartSection } from "./observation_chart_section";

const URI_PREFIX = "/browser/";

interface StatVarNodePropType {
  placeDcid: string;
  statVar: StatVarNodeType;
  nodeName: string;
  selected: boolean;
}

interface StatVarNodeStateType {
  renderContent: boolean;
}

export class StatVarNode extends React.Component<
  StatVarNodePropType,
  StatVarNodeStateType
> {
  constructor(props: StatVarNodePropType) {
    super(props);
    this.state = {
      renderContent: this.props.selected,
    };
    this.onClickStatVarLink = this.onClickStatVarLink.bind(this);
    this.onClickPlaceStatVarLink = this.onClickPlaceStatVarLink.bind(this);
  }

  render(): JSX.Element {
    const trigger = React.createElement(StatVarHierarchyNodeHeader, {
      highlighted: this.props.selected,
      nodeType: StatVarHierarchyNodeType.STAT_VAR,
      opened: false,
      title: this.props.statVar.displayName,
    });
    return (
      <Collapsible
        trigger={trigger}
        open={this.props.selected}
        onOpening={() => this.setState({ renderContent: true })}
      >
        {this.state.renderContent && (
          <div className="statvars-charts-section">
            <div className="stat-var-link">
              <span>Statistical Variable: </span>
              <span
                className="clickable-text"
                onClick={this.onClickStatVarLink}
              >
                {this.props.statVar.id}
              </span>
            </div>
            <div className="place-stat-var-link">
              <span>Place Stat Var Page: </span>
              <span
                className="clickable-text"
                onClick={this.onClickPlaceStatVarLink}
              >
                {`${this.props.statVar.id} in ${this.props.nodeName}`}
              </span>
            </div>
            <ObservationChartSection
              placeDcid={this.props.placeDcid}
              statVarId={this.props.statVar.id}
              placeName={this.props.nodeName}
            />
          </div>
        )}
      </Collapsible>
    );
  }

  private onClickStatVarLink = () => {
    const uri = URI_PREFIX + this.props.statVar.id;
    window.open(uri);
  };

  private onClickPlaceStatVarLink = () => {
    const uri = `${URI_PREFIX}${this.props.placeDcid}?statVar=${this.props.statVar.id}`;
    window.open(uri);
  };
}
