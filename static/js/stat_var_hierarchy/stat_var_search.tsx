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

import { NamedNode } from "../shared/types";
import React from "react";
import _ from "lodash";
import axios from "axios";

interface StatVarHierarchySearchPropType {
  places: string[];
  // Optional label to add above the search box
  searchLabel?: string;
  onSelectionChange: (newSelection: string) => void;
}

interface StatVarHierarchySearchStateType {
  query: string;
  svgResults: NamedNode[];
  svResults: NamedNode[];
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
      showNoResultsMessage: false,
      svResults: [],
      svgResults: [],
    };
    this.onInputChanged = this.onInputChanged.bind(this);
    this.search = this.search.bind(this);
    this.onResultSelected = this.onResultSelected.bind(this);
    this.onInputClear = this.onInputClear.bind(this);
  }

  render(): JSX.Element {
    const renderResults =
      !_.isEmpty(this.state.svResults) ||
      !_.isEmpty(this.state.svgResults) ||
      this.state.showNoResultsMessage;
    return (
      <div className="statvar-hierarchy-search-section">
        {this.props.searchLabel && (
          <div className="title">{this.props.searchLabel}</div>
        )}
        <div className="search-input-container">
          <input
            className="statvar-search-input form-control"
            type="text"
            value={this.state.query}
            onChange={this.onInputChanged}
            placeholder="Search or explore below"
            onBlur={() => this.setState({ showNoResultsMessage: false })}
          />
          {!_.isEmpty(this.state.query) && (
            <span
              className="material-icons clear-search"
              onClick={this.onInputClear}
            >
              clear
            </span>
          )}
        </div>
        {renderResults && (
          <div className="statvar-hierarchy-search-results">
            {!_.isEmpty(this.state.svgResults) && (
              <div className="svg-search-results">
                <h5 className="search-results-heading">
                  Statistical Variable Groups
                </h5>
                {this.state.svgResults.map((svg) => {
                  return (
                    <div
                      className="search-result-value"
                      onClick={this.onResultSelected(svg.dcid)}
                      key={svg.dcid}
                    >
                      {svg.name}
                    </div>
                  );
                })}
              </div>
            )}
            {!_.isEmpty(this.state.svResults) && (
              <div className="sv-search-results">
                <h5 className="search-results-heading">
                  Statistical Variables
                </h5>
                {this.state.svResults.map((sv) => {
                  return (
                    <div
                      className="search-result-value"
                      onClick={this.onResultSelected(sv.dcid)}
                      key={sv.dcid}
                    >
                      {sv.name}
                    </div>
                  );
                })}
              </div>
            )}
            {this.state.showNoResultsMessage && (
              <div className="no-results-message">No Results</div>
            )}
          </div>
        )}
      </div>
    );
  }

  private onInputChanged = (event) => {
    const query = event.target.value;
    // When the seach text is fully removed, should call onSelectChange to
    // show the clean hierarchy.
    if (query === "") {
      this.props.onSelectionChange("");
    }
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

  private search = (query: string) => () => {
    let url = `/api/browser/statvar/search?query=${query}`;
    for (const place of this.props.places) {
      url += `&places=${place}`;
    }
    axios
      .get(url)
      .then((resp) => {
        const currQuery = this.state.query;
        const data = resp.data;
        if (query === currQuery) {
          const svgResults: NamedNode[] = data.statVarGroups;
          const svResults: NamedNode[] = data.statVars;
          this.setState({
            svResults,
            svgResults,
            showNoResultsMessage:
              _.isEmpty(svgResults) &&
              _.isEmpty(svResults) &&
              !_.isEmpty(query),
          });
        }
      })
      .catch(() => {
        this.setState({
          showNoResultsMessage: true,
        });
      });
  };

  private onInputClear = () => {
    this.props.onSelectionChange("");
    this.setState({
      query: "",
      showNoResultsMessage: false,
      svResults: [],
      svgResults: [],
    });
  };

  private onResultSelected = (selectedID: string) => () => {
    this.props.onSelectionChange(selectedID);
    let displayName = "";
    if (this.state.svResults) {
      for (const sv of this.state.svResults) {
        if (sv.dcid == selectedID) {
          displayName = sv.name;
          break;
        }
      }
    }
    if (displayName === "" && this.state.svgResults) {
      for (const svg of this.state.svgResults) {
        if (svg.dcid == selectedID) {
          displayName = svg.name;
          break;
        }
      }
    }
    this.setState({
      query: displayName,
      svResults: [],
      svgResults: [],
    });
  };
}
