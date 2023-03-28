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
 * Component for rendering a stat var with charts in the stat var hierarchy.
 */

import React from "react";
import Collapsible from "react-collapsible";

import { StatVarHierarchyNodeType, StatVarInfo } from "../shared/types";
import { NamedPlace } from "../shared/types";
import { StatVarHierarchyNodeHeader } from "../stat_var_hierarchy/node_header";
import { URI_PREFIX } from "./constants";
import { ObservationChartSection } from "./observation_chart_section";

interface StatVarChartsPropType {
  place: NamedPlace;
  statVar: StatVarInfo;
  selected: boolean;
}

interface StatVarChartsStateType {
  renderContent: boolean;
}

export class StatVarCharts extends React.Component<
  StatVarChartsPropType,
  StatVarChartsStateType
> {
  constructor(props: StatVarChartsPropType) {
    super(props);
    this.state = {
      renderContent: this.props.selected,
    };
    this.onClickStatVarLink = this.onClickStatVarLink.bind(this);
    this.onClickPlaceStatVarLink = this.onClickPlaceStatVarLink.bind(this);
  }

  render(): JSX.Element {
    const trigger = React.createElement(StatVarHierarchyNodeHeader, {
      childrenStatVarCount: this.props.statVar.hasData ? 1 : 0,
      highlighted: this.props.selected,
      nodeType: StatVarHierarchyNodeType.STAT_VAR,
      opened: false,
      selectionCount: 0,
      title: this.props.statVar.displayName,
      showTooltip: false,
      nodeDcid: this.props.statVar.id,
    });
    return (
      <Collapsible
        trigger={trigger}
        open={this.props.selected}
        onOpening={() => this.setState({ renderContent: true })}
        containerElementProps={
          this.props.selected ? { className: "highlighted-stat-var" } : {}
        }
      >
        {this.state.renderContent && (
          <div className="statvars-charts-section">
            <h5 className="stat-var-link">
              <a
                href={`${URI_PREFIX}${this.props.place.dcid}?statVar=${this.props.statVar.id}`}
              >
                {this.props.statVar.id} for {this.props.place.name}
                <span className="material-icons">open_in_new</span>
              </a>
            </h5>
            <ObservationChartSection
              placeDcid={this.props.place.dcid}
              statVarId={this.props.statVar.id}
              placeName={this.props.place.name}
              statVarName={this.props.statVar.displayName}
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
    const uri = `${URI_PREFIX}${this.props.place.dcid}?statVar=${this.props.statVar.id}`;
    window.open(uri);
  };
}
