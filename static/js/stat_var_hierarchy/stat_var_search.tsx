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

import _ from "lodash";
import React from "react";

import {
  GA_EVENT_STATVAR_SEARCH_SELECTION,
  GA_EVENT_STATVAR_SEARCH_TRIGGERED,
  GA_EVENT_TOOL_STAT_VAR_SEARCH_NO_RESULT,
  GA_PARAM_QUERY,
  GA_PARAM_SEARCH_SELECTION,
  GA_PARAM_SEARCH_TERM,
  triggerGAEvent,
} from "../shared/ga_events";
import { NamedNode, SvgSearchResult } from "../shared/types";
import {
  getHighlightedJSX,
  getStatVarSearchResults,
} from "../utils/search_utils";

// Limits for the number of SV search results to fetch from Vertex AI.
export const MAX_INITIAL_RESULTS = 100;
export const MAX_TOTAL_RESULTS = 1000;

interface StatVarHierarchySearchPropType {
  entities: string[];
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
  showLoadMoreButton: boolean;
  showMoreResultsLoading: boolean;
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
      showLoadMoreButton: false,
      showMoreResultsLoading: false,
    };
    this.onInputChanged = this.onInputChanged.bind(this);
    this.search = this.search.bind(this);
    this.onResultSelected = this.onResultSelected.bind(this);
    this.onInputClear = this.onInputClear.bind(this);
    this.handleLoadMoreResults = this.handleLoadMoreResults.bind(this);
  }

  // Triggered when no result is showed to a search term and send data to google analytics.
  // Check prevstate to avoid double counting.
  componentDidUpdate(
    prevProps: StatVarHierarchySearchPropType,
    prevState: StatVarHierarchySearchStateType
  ): void {
    if (
      this.state.showNoResultsMessage &&
      !prevState.showNoResultsMessage &&
      this.state.query
    ) {
      triggerGAEvent(GA_EVENT_TOOL_STAT_VAR_SEARCH_NO_RESULT, {
        [GA_PARAM_SEARCH_TERM]: this.state.query,
      });
    }
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
        onBlur={(event): void => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            this.setState({ showResults: false });
          }
        }}
      >
        <div className="search-input-container" tabIndex={-1}>
          <input
            className="statvar-search-input form-control"
            type="text"
            value={this.state.query}
            onChange={this.onInputChanged}
            placeholder="Filter statistical variables"
          />
          {!_.isEmpty(this.state.query) && (
            <span
              className="material-icons clear-search"
              onClick={this.onInputClear}
            >
              clear
            </span>
          )}
          {renderResults && (
            <div className="statvar-hierarchy-search-results" tabIndex={-1}>
              {showResultCount && (
                <div className="result-count-message">
                  {this.getResultCountString(
                    this.state.svgResults.length,
                    numStatVars
                  )}
                </div>
              )}
              {!_.isEmpty(this.state.svgResults) && (
                <div className="svg-search-results">
                  {this.getSvgResultJsx(this.state.svgResults)}
                </div>
              )}
              {!_.isEmpty(this.state.svResults) && (
                <div className="sv-search-results">
                  {this.state.svResults.map((sv, index) => {
                    return (
                      <div
                        className="search-result-value"
                        onClick={this.onResultSelected(sv.dcid)}
                        key={`${sv.dcid}-${index}`}
                      >
                        {getHighlightedJSX(
                          sv.dcid,
                          sv.name,
                          this.state.matches
                        )}
                      </div>
                    );
                  })}
                  {this.state.showLoadMoreButton && (
                    <button
                      className="load-more-button"
                      onClick={this.handleLoadMoreResults}
                    >
                      {this.state.showMoreResultsLoading ? (
                        <div className="sv-search-loading">
                          <div id="sv-search-spinner"></div>
                          <span>Loading</span>
                        </div>
                      ) : (
                        <div className="load-more-text">
                          Load More Results (up to 1000 total)
                        </div>
                      )}
                    </button>
                  )}
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
        {this.props.searchLabel && (
          <div className="title">{this.props.searchLabel}</div>
        )}
      </div>
    );
  }

  getResultCountString(numSvg: number, numSv: number): string {
    let result = "Matches ";
    if (numSvg > 0) {
      const suffix = numSvg > 1 ? " groups" : " group";
      result += numSvg + suffix;
    }
    if (numSv > 0) {
      const prefix = numSvg > 0 ? " and " : "";
      const suffix =
        numSv > 1 ? " statistical variables" : " statistical variable";
      result += prefix + numSv + suffix;
    }
    return result;
  }

  private onInputChanged = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ showResults: true });
    const query = event.target.value;
    // When the seach text is fully removed, should call onSelectChange to
    // show the clean hierarchy.
    if (query === "") {
      this.props.onSelectionChange("");
    }
    // When the user is starting a new search (i.e. previous query is empty),
    // trigger Google Analytics event
    if (this.state.query === "" && query !== "") {
      triggerGAEvent(GA_EVENT_STATVAR_SEARCH_TRIGGERED, {});
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

  private search =
    (query: string, limit: number = MAX_INITIAL_RESULTS) =>
    (): void => {
      getStatVarSearchResults(query, this.props.entities, false, limit)
        .then((data) => {
          const currQuery = this.state.query;
          if (query === currQuery) {
            this.setState({
              matches: data.matches,
              showNoResultsMessage:
                _.isEmpty(data.statVarGroups) &&
                _.isEmpty(data.statVars) &&
                !_.isEmpty(query),
              svgResults: data.statVarGroups,
              svResults: data.statVars,
              showLoadMoreButton:
                data.statVars.length === limit && limit === MAX_INITIAL_RESULTS,
              showMoreResultsLoading: false,
            });
          }
        })
        .catch(() => {
          this.setState({
            matches: [],
            showNoResultsMessage: true,
            svgResults: [],
            svResults: [],
            showLoadMoreButton: false,
            showMoreResultsLoading: false,
          });
        });
    };

  private onInputClear = (): void => {
    this.props.onSelectionChange("");
    this.setState({
      query: "",
      showNoResultsMessage: false,
      showResults: false,
      svResults: [],
      svgResults: [],
      showLoadMoreButton: false,
      showMoreResultsLoading: false,
    });
  };

  private onResultSelected = (selectedID: string) => (): void => {
    this.props.onSelectionChange(selectedID);
    // Trigger Google Analytics event to track a successful search
    triggerGAEvent(GA_EVENT_STATVAR_SEARCH_SELECTION, {
      [GA_PARAM_QUERY]: this.state.query,
      [GA_PARAM_SEARCH_SELECTION]: selectedID,
    });
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
      showLoadMoreButton: false,
      showMoreResultsLoading: false,
    });
  };

  private getSvgResultJsx(svgResults: SvgSearchResult[]): JSX.Element[] {
    const svgResultJsx = svgResults.map((svg) => {
      const titleJsx = getHighlightedJSX(
        svg.dcid,
        svg.name,
        this.state.matches
      );
      let subtitleJsx = null;
      let subtitleSuffix = "";
      if (svg.statVars && svg.statVars.length > 0) {
        subtitleJsx = getHighlightedJSX(
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

  private handleLoadMoreResults = (): void => {
    this.setState({ showMoreResultsLoading: true });
    this.search(this.state.query, MAX_TOTAL_RESULTS)();
  };
}
