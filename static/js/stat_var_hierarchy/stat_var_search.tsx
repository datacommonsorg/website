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
  GA_EVENT_TOOL_STAT_VAR_SEARCH_NO_RESULT,
  GA_PARAM_SEARCH_TERM,
  triggerGAEvent,
} from "../shared/ga_events";
import { NamedNode, SvgSearchResult } from "../shared/types";
import {
  getHighlightedJSX,
  getStatVarSearchResults,
} from "../utils/search_utils";

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
        onBlur={(event) => {
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
                  {this.state.svResults.map((sv) => {
                    return (
                      <div
                        className="search-result-value"
                        onClick={this.onResultSelected(sv.dcid)}
                        key={sv.dcid}
                      >
                        {getHighlightedJSX(
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
    getStatVarSearchResults(query, this.props.entities, false)
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
    var selected = this.state.svResults.filter((sv) => sv.dcid == selectedID);
    if (selected) {
      // ID filter should only ever yield one match.
      let url = decodeURIComponent(window.location.href);
      console.log("Decoded URL " + url);

      // Identify the sv parameter.
      const regex = new RegExp('sv\=([A-Za-z0-9_\\/])([A-Za-z0-9_\\/])*(\\&|$)');
      const match = url.match(regex);
      if (match) {
        url = url.replace(regex, `sv=${selected[0].dcid}&`);
      } else {
        url += `#sv=${selected[0].dcid}`;
      }
      window.open(encodeURI(url), "_self");
    } else {
      // Fallback to SVG result search.
      selected = this.state.svgResults.filter((svg) => svg.dcid == selectedID);
      if (selected) {
        displayName = selected[0].name;
      }
    }
    this.setState({
      query: displayName,
      showResults: false,
      svResults: [],
      svgResults: [],
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
}
