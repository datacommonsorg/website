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
import {
  NamedNode,
  StatVarHierarchyType,
  StatVarInfo,
  StatVarSummary,
} from "../shared/types";
import { stringifyFn } from "../utils/axios";
import { getCommonPrefix } from "../utils/string_utils";
import { StatVarSectionInput } from "./stat_var_section_input";

interface StatVarSectionPropType {
  path: string[];
  data: StatVarInfo[];
  pathToSelection: string[];
  entities: NamedNode[];
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
    const prefix = this.getPrefix(this.props.data);
    const showPrefix =
      context.statVarHierarchyType !== StatVarHierarchyType.BROWSER && prefix;
    return (
      <div className="svg-node-child">
        {showPrefix && (
          <div className="stat-var-section-prefix">{prefix} …</div>
        )}
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
              {context.statVarHierarchyType === StatVarHierarchyType.BROWSER ? (
                <StatVarCharts
                  place={this.props.entities[0]}
                  selected={isSelected || statVar.id in context.svPath}
                  statVar={statVar}
                />
              ) : (
                <StatVarSectionInput
                  path={this.props.path.concat([statVar.id])}
                  selected={isSelected}
                  statVar={statVar}
                  summary={summary}
                  prefixToReplace={prefix}
                />
              )}
            </div>
          );
        }, this)}
      </div>
    );
  }

  public getPrefix(svList: StatVarInfo[]): string {
    const svNamesList = svList
      .filter((sv) => sv.displayName)
      .map((sv) => sv.displayName);
    // Only get prefix if there is more than 1 stat var.
    if (svNamesList.length < 2) {
      return "";
    }
    const svNamesCommonPrefix = getCommonPrefix(svNamesList);
    // Cut the prefix at the last complete word.
    let idx = svNamesCommonPrefix.length - 1;
    while (idx >= 0 && svNamesCommonPrefix[idx] !== " ") {
      idx--;
    }
    return idx > 0 ? svNamesCommonPrefix.slice(0, idx) : "";
  }

  private fetchSummary(): void {
    if (this.props.data.length === 0) {
      return;
    }
    const statVarList = this.props.data.map((sv) => sv.id);
    this.svSummaryFetching = statVarList;
    axios
      .get("/api/variable/info", {
        params: {
          dcids: statVarList,
        },
        paramsSerializer: stringifyFn,
      })
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
