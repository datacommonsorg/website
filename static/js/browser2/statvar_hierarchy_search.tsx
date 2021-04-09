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
 * Component for rendering the search part of the stat var hierarchy including
 * the search input and dropdown results.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";
import { StatVarGroupNodeType, StatVarNodeType } from "./util";

interface StatVarHierarchySearchPropType {
  statVarGroupsData: { [key: string]: StatVarGroupNodeType };
  statVarsData: { [key: string]: StatVarNodeType };
  onSelectionChange: (newSelection: string) => void;
}

interface StatVarHierarchySearchStateType {
  query: string;
  svgResults: string[];
  svResults: string[];
  showNoResultsMessage: boolean;
}

export class StatVarHierarchySearch extends React.Component<
  StatVarHierarchySearchPropType,
  StatVarHierarchySearchStateType
> {
  private delayTimer: NodeJS.Timeout;

  constructor(props: StatVarHierarchySearchPropType) {
    super(props);
    this.state = {
      query: "",
      svgResults: [],
      svResults: [],
      showNoResultsMessage: false,
    };
    this.onInputChanged = this.onInputChanged.bind(this);
    this.search = this.search.bind(this);
    this.onResultSelected = this.onResultSelected.bind(this);
  }

  render(): JSX.Element {
    const renderResults =
      !_.isEmpty(this.state.svResults) ||
      !_.isEmpty(this.state.svgResults) ||
      this.state.showNoResultsMessage;
    return (
      <div className="statvar-hierarchy-search-section">
        <input
          className="statvar-search-input"
          type="text"
          value={this.state.query}
          onChange={this.onInputChanged}
          placeholder="Search"
          onBlur={() => this.setState({ showNoResultsMessage: false })}
        />
        {renderResults ? (
          <div className="statvar-hierarchy-search-results">
            {!_.isEmpty(this.state.svgResults) ? (
              <div className="svg-search-results">
                <div className="search-results-heading">Stat Var Groups</div>
                {this.state.svgResults.map((svg) => {
                  return (
                    <div
                      className="search-result-value"
                      onClick={this.onResultSelected(svg)}
                      key={svg}
                    >
                      {this.props.statVarGroupsData[svg].absoluteName}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {!_.isEmpty(this.state.svResults) ? (
              <div className="sv-search-rsults">
                <div className="search-results-heading">Stat Vars</div>
                {this.state.svResults.map((sv) => {
                  return (
                    <div
                      className="search-result-value"
                      onClick={this.onResultSelected(sv)}
                      key={sv}
                    >
                      {this.props.statVarsData[sv].displayName}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {this.state.showNoResultsMessage ? (
              <div className="no-results-message">No Results</div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  private onInputChanged = (event) => {
    this.props.onSelectionChange("");
    const query = event.target.value;
    this.setState({
      query: event.target.value,
      showNoResultsMessage: false,
    });
    clearTimeout(this.delayTimer);
    if (query[query.length - 1] === " ") {
      this.search(query)();
    } else {
      this.delayTimer = setTimeout(this.search(query), 300);
    }
  };

  private search = (query) => () => {
    axios
      .get(`/api/browser/search_statvar_hierarchy?query=${query}`)
      .then((resp) => {
        const currQuery = this.state.query;
        const data = resp.data;
        if (query === currQuery) {
          const processedResults = this.processSearchResults(data);
          const svgResults = processedResults.statVarGroups;
          const svResults = processedResults.statVars;
          this.setState({
            svgResults,
            svResults,
            showNoResultsMessage:
              _.isEmpty(svgResults) &&
              _.isEmpty(svResults) &&
              !_.isEmpty(query),
          });
        }
      });
  };

  private processSearchResults(
    resultsList: string[]
  ): { statVarGroups: string[]; statVars: string[] } {
    const statVarGroupIds = new Set(Object.keys(this.props.statVarGroupsData));
    const statVarIds = new Set(Object.keys(this.props.statVarsData));
    const svgResults = [];
    const svResults = [];
    for (const result of resultsList) {
      if (statVarGroupIds.has(result)) {
        svgResults.push(result);
      } else if (statVarIds.has(result)) {
        svResults.push(result);
      }
    }
    const sortedSvgResults = svgResults.sort(
      this.sortResultsComparator(this.props.statVarGroupsData)
    );
    const sortedSvResults = svResults.sort(
      this.sortResultsComparator(this.props.statVarsData)
    );
    return { statVarGroups: sortedSvgResults, statVars: sortedSvResults };
  }

  private sortResultsComparator = (
    data:
      | { [key: string]: StatVarNodeType }
      | { [key: string]: StatVarGroupNodeType }
  ) => (a, b) => {
    const aNumPv = a.split("_").length;
    const bNumPv = b.split("_").length;
    // if non human curated id, move to the bottom of the list
    if (aNumPv === 1) {
      return 1;
    } else if (bNumPv === 1) {
      return -1;
    }
    const pvDiff = aNumPv - bNumPv;
    if (pvDiff === 0) {
      const aName = "searchName" in data[a] ? data[a]["searchName"] : data[a]["absoluteName"];
      const bName = "searchName" in data[b] ? data[b]["searchName"] : data[b]["absoluteName"];
      return aName.length - bName.length;
    } else {
      return pvDiff;
    }
  };

  private onResultSelected = (selectedResult: string) => () => {
    this.props.onSelectionChange(selectedResult);
    const displayName =
      selectedResult in this.props.statVarGroupsData
        ? this.props.statVarGroupsData[selectedResult].absoluteName
        : this.props.statVarsData[selectedResult].displayName;
    this.setState({
      query: displayName,
      svgResults: [],
      svResults: [],
    });
  };
}
