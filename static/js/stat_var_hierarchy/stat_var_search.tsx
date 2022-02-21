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

import axios from "axios";
import _ from "lodash";
import React from "react";

import { NamedNode } from "../shared/types";

interface SvgSearchResult {
  dcid: string;
  name: string;
  statVars?: Array<NamedNode>;
}

interface StatVarHierarchySearchPropType {
  places: string[];
  // Optional label to add above the search box
  searchLabel?: string;
  onSelectionChange: (newSelection: string) => void;
}

interface StatVarHierarchySearchStateType {
  query: string;
  svgResults: SvgSearchResult[];
  svResults: NamedNode[];
  matches: string[];
  showResults: boolean;
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
      matches: [],
      query: "",
      showNoResultsMessage: false,
      showResults: false,
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
      this.state.showResults && !_.isEmpty(this.state.query);
    const showLoading =
      !this.state.showNoResultsMessage &&
      _.isEmpty(this.state.svResults) &&
      _.isEmpty(this.state.svgResults);
    let numStatVars = this.state.svResults.length;
    this.state.svgResults.forEach((svg) => {
      if (svg.statVars) {
        numStatVars += svg.statVars.length;
      }
    });
    const showResultCount = !showLoading && !this.state.showNoResultsMessage;
    return (
      <div
        className="statvar-hierarchy-search-section"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            this.setState({ showResults: false });
          }
        }}
      >
        {this.props.searchLabel && (
          <div className="title">{this.props.searchLabel}</div>
        )}
        <div className="search-input-container" tabIndex={-1}>
          <input
            className="statvar-search-input form-control"
            type="text"
            value={this.state.query}
            onChange={this.onInputChanged}
            placeholder="Search or explore below"
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
          <div className="statvar-hierarchy-search-results" tabIndex={-1}>
            {showResultCount && (
              <div className="result-count-message">
                Matches {this.state.svgResults.length} groups and {numStatVars}{" "}
                statistical variables
              </div>
            )}
            {!_.isEmpty(this.state.svgResults) && (
              <div className="svg-search-results">
                {this.getSvgResultJsx(this.state.svgResults)}
              </div>
            )}
            {!_.isEmpty(this.state.svResults) && (
              <div className="sv-search-results">
                {this.state.svResults.map((sv) => {
                  return (
                    <div
                      className="search-result-value"
                      onClick={this.onResultSelected(sv.dcid)}
                      key={sv.dcid}
                    >
                      {this.getHighlightedJSX(
                        sv.dcid,
                        sv.name,
                        this.state.matches
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {this.state.showNoResultsMessage && (
              <div className="no-results-message">No Results</div>
            )}
            {showLoading && (
              <div className="sv-search-loading">
                <div id="sv-search-spinner"></div>
                <span>Loading</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  private onInputChanged = (event) => {
    this.setState({ showResults: true });
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
    let url = `/api/stats/stat-var-search?query=${query}`;
    for (const place of this.props.places) {
      url += `&places=${place}`;
    }
    axios
      .get(url)
      .then((resp) => {
        const currQuery = this.state.query;
        const data = resp.data;
        if (query === currQuery) {
          const svgResults: SvgSearchResult[] = data.statVarGroups || [];
          const svResults: NamedNode[] = data.statVars || [];
          const matches: string[] = data.matches || [];
          this.setState({
            matches,
            showNoResultsMessage:
              _.isEmpty(svgResults) &&
              _.isEmpty(svResults) &&
              !_.isEmpty(query),
            svgResults,
            svResults,
          });
        }
      })
      .catch(() => {
        this.setState({
          matches: [],
          showNoResultsMessage: true,
          svgResults: [],
          svResults: [],
        });
      });
  };

  private onInputClear = () => {
    this.props.onSelectionChange("");
    this.setState({
      query: "",
      showNoResultsMessage: false,
      showResults: false,
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
      showResults: false,
      svResults: [],
      svgResults: [],
    });
  };

  // Creates a jsx element with parts of the string matching a set of words
  // highlighted.
  // eg. s: "test string abc def", matches: ["abc", "blank"]
  //     would return s with "abc" highlighted
  getHighlightedJSX(id: string, s: string, matches: string[]): JSX.Element {
    let prevResult = [s];
    let currResult = [];
    matches.sort((a, b) => b.length - a.length);
    for (const match of matches) {
      const re = new RegExp(`(${match})`, "gi");
      prevResult.forEach((stringPart) =>
        currResult.push(...stringPart.split(re))
      );
      prevResult = currResult;
      currResult = [];
    }
    return (
      <>
        {prevResult.map((stringPart, i) => {
          if (matches.indexOf(stringPart) > -1) {
            return <b key={`${id}-${i}`}>{stringPart}</b>;
          } else {
            return stringPart;
          }
        })}
      </>
    );
  }

  private getSvgResultJsx(svgResults: SvgSearchResult[]): JSX.Element[] {
    const svgResultJsx = svgResults.map((svg) => {
      const titleJsx = this.getHighlightedJSX(
        svg.dcid,
        svg.name,
        this.state.matches
      );
      let subtitleJsx = null;
      let subtitleSuffix = "";
      if (svg.statVars && svg.statVars.length > 0) {
        subtitleJsx = this.getHighlightedJSX(
          svg.dcid + "-subtitle",
          svg.statVars[0].name,
          this.state.matches
        );
        if (svg.statVars.length > 1) {
          subtitleSuffix = ` and ${svg.statVars.length - 1} more`;
        }
      }
      return (
        <div
          className="search-result-value"
          onClick={this.onResultSelected(svg.dcid)}
          key={svg.dcid}
        >
          <div className="svg-search-result-title">
            <span className="material-icons-outlined">list_alt</span>
            <span>{titleJsx}</span>
          </div>
          {!_.isEmpty(subtitleJsx) && (
            <div className="svg-search-result-subtitle">
              matches {subtitleJsx}
              {subtitleSuffix}
            </div>
          )}
        </div>
      );
    });
    return svgResultJsx;
  }
}
