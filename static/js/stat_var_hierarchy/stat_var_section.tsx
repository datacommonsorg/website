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
 * Component for rendering a section for a stat, which could be a collapsible
 * region with chart, or a checkbox.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { StatVarCharts } from "../browser/stat_var_charts";
import { Context } from "../shared/context";
import { NamedPlace, StatVarHierarchyType } from "../shared/types";
import { StatVarInfo, StatVarSummary } from "../shared/types";
import { getCommonPrefix } from "../utils/string_utils";
import { StatVarSectionInput } from "./stat_var_section_input";

interface StatVarSectionPropType {
  path: string[];
  data: StatVarInfo[];
  pathToSelection: string[];
  places: NamedPlace[];
  highlightedStatVar: React.RefObject<HTMLDivElement>;
}

interface StatVarSectionStateType {
  svSummary: { [sv: string]: StatVarSummary };
  svSummaryFetched: string[];
}

export class StatVarSection extends React.Component<
  StatVarSectionPropType,
  StatVarSectionStateType
> {
  svSummaryFetching: string[];

  constructor(props: StatVarSectionPropType) {
    super(props);
    this.state = {
      svSummary: {},
      svSummaryFetched: [],
    };
  }

  componentDidMount(): void {
    this.fetchSummary();
  }

  componentDidUpdate(): void {
    // Check if there are any stat vars in this section for which the summary
    // hasn't been fetched yet or isn't in the process of being fetched. If so,
    // fetch summary.
    let svToFetch = this.props.data.map((sv) => sv.id);
    if (this.svSummaryFetching === null) {
      svToFetch = _.difference(svToFetch, this.state.svSummaryFetched);
    } else {
      svToFetch = _.difference(svToFetch, this.svSummaryFetching);
    }
    if (!_.isEmpty(svToFetch)) {
      this.fetchSummary();
    }
  }

  render(): JSX.Element {
    const context = this.context;
    const svNamesList = this.props.data.map((sv) => sv.displayName);
    const svNamesCommonPrefix = getCommonPrefix(svNamesList);
    return (
      <div className="svg-node-child">
        {this.props.data.map((statVar) => {
          const isSelected =
            this.props.pathToSelection.length === 1 &&
            this.props.pathToSelection[0] === statVar.id;
          const summary = this.state.svSummary[statVar.id];
          return (
            <div
              key={statVar.id}
              ref={isSelected ? this.props.highlightedStatVar : null}
            >
              {context.statVarHierarchyType == StatVarHierarchyType.BROWSER ? (
                <StatVarCharts
                  place={this.props.places[0]}
                  selected={isSelected || statVar.id in context.svPath}
                  statVar={statVar}
                />
              ) : (
                <StatVarSectionInput
                  path={this.props.path.concat([statVar.id])}
                  selected={isSelected}
                  statVar={statVar}
                  summary={summary}
                  prefix={svNamesCommonPrefix}
                />
              )}
            </div>
          );
        }, this)}
      </div>
    );
  }

  private fetchSummary(): void {
    if (this.props.data.length === 0) {
      return;
    }
    const statVarList = this.props.data.map((sv) => sv.id);
    this.svSummaryFetching = statVarList;
    axios
      .post("/api/stats/stat-var-summary", { statVars: statVarList })
      .then((resp) => {
        const data = resp.data;
        this.svSummaryFetching = null;
        this.setState({ svSummary: data, svSummaryFetched: statVarList });
      })
      .catch(() => {
        this.svSummaryFetching = null;
        this.setState({ svSummaryFetched: statVarList });
      });
  }
}

StatVarSection.contextType = Context;
