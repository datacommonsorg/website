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

require("@babel/polyfill");

import React, { Component } from "react";
import pluralize from "pluralize";
import _ from "lodash";
import { DataPoint, DataGroup } from "./chart/base";

import { randDomId } from "./util";
import {
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
} from "./chart/draw";
import chartConfig from "./chart_config.json";
import { fetchStatsData } from "./data_fetcher";

const chartTypeEnum = {
  LINE: "LINE",
  SINGLE_BAR: "SINGLE_BAR",
  STACK_BAR: "STACK_BAR",
  GROUP_BAR: "GROUP_BAR",
};

const axisEnum = {
  TIME: "TIME",
  PLACE: "PLACE",
};

const placeRelationEnum = {
  CONTAINING: "CONTAINING",
  CONTAINED: "CONTAINED",
  SIMILAR: "SIMILAR",
  NEARBY: "NEARBY",
};

const CHART_HEIGHT = 194;

interface ConfigType {
  title: string;
  topic: string;
  chartType: string;
  statsVars: string[];
  source: string;
  url: string;
  axis: string;
  placeTypes: string[];
  scaling: number;
  perCapita: boolean;
  unit: string;
}

interface ParentPlacePropsType {
  parentPlaces: { dcid: string; name: string }[];
}

class ParentPlace extends Component<ParentPlacePropsType, {}> {
  constructor(props) {
    super(props);
  }
  render() {
    let num = this.props.parentPlaces.length;
    return this.props.parentPlaces.map((item, index) => {
      return (
        <React.Fragment key={item["dcid"]}>
          <a
            className="place-links"
            href="#"
            onClick={this._handleClick.bind(this, item["dcid"])}
          >
            {item["name"]}
          </a>
          {index < num - 1 && <span>, </span>}
        </React.Fragment>
      );
    });
  }

  _handleClick(dcid, e) {
    e.preventDefault();
    const queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    urlParams.set("dcid", dcid);
    window.location.search = urlParams.toString();
  }
}

interface RankingPropsType {
  data: { Population: {}[] };
}

class Ranking extends Component<RankingPropsType, {}> {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <React.Fragment>
        <thead>
          <tr>
            <th scope="col">Rankings (in) </th>
            {this.props.data["Population"].map((item, index) => {
              return (
                <th scope="col" key={index}>
                  {item["name"]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {this.props.data["label"].map((item, index) => {
            return (
              <tr key={index}>
                <th scope="row">{item}</th>
                {this.props.data[item].map((rankingInfo, index) => {
                  let top = rankingInfo["data"]["rankFromTop"];
                  let bottom = rankingInfo["data"]["rankFromBottom"];
                  let text = "";
                  if (!isNaN(top) && !isNaN(bottom)) {
                    text = `${top} of ${top + bottom}`;
                  }
                  return <td key={index}>{text}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </React.Fragment>
    );
  }
}

interface MenuPropsType {
  dcid: string;
  topic: string;
}

class Menu extends Component<MenuPropsType, {}> {
  render() {
    let dcid = this.props.dcid;
    let topic = this.props.topic;
    return (
      <ul id="nav-topics" className="nav flex-column accordion">
        <li className="nav-item">
          <a
            href={`/place?dcid=${dcid}`}
            className={`nav-link ${!topic ? "active" : ""}`}
          >
            Overview
          </a>
        </li>
        {chartConfig.map(
          (item: {
            label: string;
            charts: ConfigType[];
            children: {label: string, charts: ConfigType[]}[];
          }) => {
            return (
              <li className="nav-item" key={item.label}>
                <a
                  href={`/place?dcid=${dcid}&topic=${item.label}`}
                  className={`nav-link ${topic == item.label ? "active" : ""}`}
                >
                  {item.label}
                </a>
                <ul
                  className={
                    "nav flex-column ml-3 " +
                    (item.label != topic ? "collapse" : "")
                  }
                  data-parent="#nav-topics"
                >
                  <div className="d-block">
                    {item.children.map((child, index) => {
                      return (
                        <li className="nav-item" key={index}>
                          <a
                            href={`/place?dcid=${dcid}&topic=${item.label}#${child.label}`}
                            className="nav-link"
                          >
                            {child.label}
                          </a>
                        </li>
                      );
                    })}
                  </div>
                </ul>
              </li>
            );
          }
        )}
      </ul>
    );
  }
}

interface MainPanePropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The place type.
   */
  placeType: string;
  /**
   * The topic of the current page.
   */
  topic: string;
  /**
   * An array of parent place objects.
   */
  parentPlaces: { dcid: string; name: string }[];
  /**
   * A promise resolves to child places dcids.
   */
  childPlacesPromise: Promise<{ [key: string]: Object[] }>;
  /**
   * A promise resolves to similar places dcids.
   */
  similarPlacesPromise: Promise<{ dcid: string; name: string }>;
  /**
   * A promise resolves to nearby places dcids.
   */
  nearbyPlacesPromise: Promise<{ dcid: string; name: string }>;
  /**
   * An object from statsvar dcid to the url tokens used by timeline tool.
   */
  statsVarInfo: { [key: string]: string };
}

class MainPane extends Component<MainPanePropType, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    let configData = [];
    let isOverview = !this.props.topic;
    if (!this.props.topic) {
      configData = chartConfig;
    } else {
      for (let group of chartConfig) {
        if (group.label == this.props.topic) {
          configData = group.children;
          break;
        }
      }
    }
    return (
      <React.Fragment>
        {this.props.dcid != "country/USA" && (
          <Overview topic={this.props.topic} dcid={this.props.dcid} />
        )}
        {configData.map((item, index) => {
          let subtopicHeader;
          if (isOverview) {
            subtopicHeader = (
              <h3 id={item.label}>
                <a href={`/place?dcid=${this.props.dcid}&topic=${item.label}`}>
                  {item.label}
                </a>
                <span className="more">
                  <a
                    href={`/place?dcid=${this.props.dcid}&topic=${item.label}`}
                  >
                    More charts ›
                  </a>
                </span>
              </h3>
            );
          } else {
            subtopicHeader = <h3 id={item.label}>{item.label}</h3>;
          }
          return (
            <section className="subtopic col-12" key={index}>
              {subtopicHeader}
              <div className="row row-cols-md-2 row-cols-1">
                {item.charts.map((config: ConfigType, index: number) => {
                  let id = randDomId();
                  return (
                    <Chart
                      key={index}
                      id={id}
                      config={config}
                      dcid={this.props.dcid}
                      placeType={this.props.placeType}
                      parentPlaces={this.props.parentPlaces}
                      childPlacesPromise={this.props.childPlacesPromise}
                      similarPlacesPromise={this.props.similarPlacesPromise}
                      nearbyPlacesPromise={this.props.nearbyPlacesPromise}
                      statsVarInfo={this.props.statsVarInfo}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </React.Fragment>
    );
  }
}

interface OverviewPropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The topic of the current page.
   */
  topic: string;
}

class Overview extends Component<OverviewPropType, {}> {
  render() {
    if (this.props.topic) {
      return null;
    }
    return (
      <React.Fragment>
        <section className="factoid col-12">
          <div className="row">
            <div className="col-12 col-md-4">
              <div id="map-container"></div>
            </div>
            <div className="col-12 col-md-8">
              <table id="ranking-table" className="table"></table>
              <footer>
                Data from <a href="https://www.census.gov/">census.gov</a>,{" "}
                <a href="https://www.fbi.gov/">fbi.gov</a> and{" "}
                <a href="https://www.bls.gov/">bls.gov</a>
              </footer>
            </div>
          </div>
        </section>
      </React.Fragment>
    );
  }
}

interface ChildPlacePropType {
  childPlaces: { string: { dcid: string; name: string }[] };
}

class ChildPlace extends Component<ChildPlacePropType, {}> {
  render() {
    if (Object.keys(this.props.childPlaces).length == 0) {
      return "";
    }
    return (
      <React.Fragment>
        {Object.keys(this.props.childPlaces).map((placeType) => (
          <div key={placeType}>
            <div className="child-place-type">{pluralize(placeType)}</div>
            {this.props.childPlaces[placeType].map((place, i) => (
              <a
                key={place["dcid"]}
                className="child-place-link"
                href={"/place?dcid=" + place["dcid"]}
              >
                {place["name"]}
                {i < this.props.childPlaces[placeType].length - 1 && (
                  <span>,</span>
                )}
              </a>
            ))}
          </div>
        ))}
      </React.Fragment>
    );
  }
}

interface ChartPropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The svg dom element id.
   */
  id: string;
  /**
   * An object of the chart config.
   */
  config: ConfigType;
  /**
   * The place type.
   */
  placeType: string;
  /**
   * The parent places object array.
   *
   * Parent object are sorted by enclosing order. For example:
   * "San Jose", "Santa Clara County", "California"
   */
  parentPlaces: { dcid: string; name: string }[];
  /**
   * The child places promise.
   */
  childPlacesPromise: Promise<{ [key: string]: Object[] }>;
  /**
   * The similar places promise.
   */
  similarPlacesPromise: Promise<{ dcid: string; name: string }>;
  /**
   * The nearby places promise.
   */
  nearbyPlacesPromise: Promise<{ dcid: string; name: string }>;
  /**
   * An object from statsvar dcid to the url tokens used by timeline tool.
   */
  statsVarInfo: { [key: string]: string };
}

interface ChartStateType {
  dataPoints?: DataPoint[];
  dataGroups?: DataGroup[];
  elemWidth: number;
}

class Chart extends Component<ChartPropType, ChartStateType> {
  chartElement: React.RefObject<HTMLDivElement>;
  dcid: string;
  titleSuffix: string;
  shouldRender: boolean;
  placeRelation: string;

  constructor(props) {
    super(props);
    this.chartElement = React.createRef();

    this.state = {
      elemWidth: 0,
    };
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this._handlePlaceSelection = this._handlePlaceSelection.bind(this);
    this.dcid = props.dcid;
    this.titleSuffix = "";
    this.shouldRender = true;

    // Default use similar places.
    this.placeRelation = placeRelationEnum.SIMILAR;

    let config = props.config;
    if (config.placeTypes) {
      let pagePlaceType = props.placeType;
      if (
        config.chartType == chartTypeEnum.LINE ||
        config.chartType == chartTypeEnum.SINGLE_BAR
      ) {
        if (config.placeTypes.includes(pagePlaceType)) {
          // Renders the chart if it is valid for the page's place type.
          this.shouldRender = true;
        } else {
          // If the page's place type is not valid, use the parent with valid
          // type. Also reset the dcid of the place to be that of the parent.
          this.shouldRender = false;
          for (const parent of props.parentPlaces) {
            if (_.intersection(config.placeTypes, parent["types"]).length > 0) {
              this.dcid = parent["dcid"];
              this.titleSuffix = ` (${parent["name"]})`;
              this.shouldRender = true;
              break;
            }
          }
        }
      } else {
        // For chart of related places, choose similar places if type matches,
        // otherwise try use parent places for "contained" selection.
        if (config.placeTypes.includes(pagePlaceType)) {
          this.placeRelation = placeRelationEnum.SIMILAR;
        } else {
          let isContained = false;
          for (const parent of props.parentPlaces) {
            if (_.intersection(config.placeTypes, parent["types"]).length > 0) {
              this.placeRelation = placeRelationEnum.CONTAINED;
              isContained = true;
              break;
            }
          }
          if (!isContained) {
            this.placeRelation = placeRelationEnum.CONTAINING;
          }
        }
      }
    }
  }

  render() {
    const config = this.props.config;
    if (!this.shouldRender) {
      return "";
    }
    return (
      <div className="col" ref={this.chartElement}>
        <div className="chart-container">
          <h4>
            {config.title}
            <span className="sub-title">{this.titleSuffix}</span>
          </h4>
          {config.axis == axisEnum.PLACE && (
            <label>
              Choose places:{" "}
              <select
                value={this.placeRelation}
                onChange={this._handlePlaceSelection}
              >
                <option value="CONTAINED">contained</option>
                {this.props.placeType != "City" && (
                  <option value="CONTAINING">containing</option>
                )}
                {(!config.placeTypes ||
                  config.placeTypes.includes(this.props.placeType)) && (
                  <React.Fragment>
                    <option value="SIMILAR">simliar</option>
                    <option value="NEARBY">nearby</option>
                  </React.Fragment>
                )}
              </select>
            </label>
          )}
          <div id={this.props.id}></div>
          <footer className="row explore-more-container">
            <div>
              Data from <a href={config.url}>{config.source}</a>
            </div>
            <div>
              <a
                target="_blank"
                className="explore-more"
                href={this.buildTimelineToolUrl()}
              >
                Explore More ›
              </a>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  componentDidUpdate() {
    // When there is no data, do not show the current chart.
    const dp = this.state.dataPoints;
    const dg = this.state.dataGroups;
    if (
      (dp && dp.length == 0) ||
      (dg && (dg.length == 0 || (dg.length == 1 && dg[0].value.length == 0)))
    ) {
      this.chartElement.current.innerHTML = "";
      this.chartElement.current.classList.remove("col");
      return;
    }
    // Draw chart.
    try {
      this.drawChart();
    } catch (e) {
      console.log(e);
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount() {
    window.addEventListener("resize", this._handleWindowResize);
    this.fetchData();
  }

  _handleWindowResize() {
    let svgElement = document.getElementById(this.props.id);
    if (!svgElement) {
      return;
    }
    // Chart resizes at bootstrap breakpoints
    let width = svgElement.offsetWidth;
    if (width != this.state.elemWidth) {
      this.setState({
        elemWidth: width,
      });
    }
  }

  _handlePlaceSelection(event) {
    this.placeRelation = event.target.value;
    this.fetchData();
  }

  buildTimelineToolUrl() {
    // TODO(boxu): change this to /tools/timeline after link migration.
    let url = "/gni#&ptpv=";
    let parts = [];
    for (let statsVar of this.props.config.statsVars) {
      parts.push(this.props.statsVarInfo[statsVar]);
    }
    url += parts.join("__");
    url += `&place=${this.props.dcid}`;
    return url;
  }

  drawChart() {
    const chartType = this.props.config.chartType;
    let elem = document.getElementById(this.props.id);
    elem.innerHTML = "";
    if (chartType == chartTypeEnum.LINE) {
      drawLineChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.config.unit
      );
    } else if (chartType == chartTypeEnum.SINGLE_BAR) {
      drawSingleBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataPoints,
        this.props.config.unit
      );
    } else if (chartType == chartTypeEnum.STACK_BAR) {
      drawStackBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.config.unit
      );
    } else if (chartType == chartTypeEnum.GROUP_BAR) {
      drawGroupBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.config.unit
      );
    }
  }

  async fetchData() {
    if (!this.shouldRender) {
      return;
    }
    let dcid = this.dcid;
    const config = this.props.config;
    const chartType = config.chartType;
    const perCapita = !!config.perCapita;
    let scaling = 1;
    if (config.scaling) {
      scaling = config.scaling;
    }
    switch (chartType) {
      case chartTypeEnum.LINE:
        fetchStatsData([dcid], config.statsVars).then((data) => {
          this.setState({
            dataGroups: data.getStatsVarGroupWithTime(dcid),
          });
        });
        break;
      case chartTypeEnum.SINGLE_BAR:
        fetchStatsData([dcid], config.statsVars).then((data) => {
          this.setState({
            dataPoints: data.getStatsPoint(dcid),
          });
        });
        break;
      case chartTypeEnum.GROUP_BAR:
      // Fall-through
      case chartTypeEnum.STACK_BAR:
        switch (config.axis) {
          case axisEnum.PLACE:
            let placesPromise;
            if (this.placeRelation == placeRelationEnum.CONTAINED) {
              placesPromise = Promise.resolve([
                dcid,
                ...this.props.parentPlaces.map((parent) => parent["dcid"]),
              ]);
            } else if (this.placeRelation == placeRelationEnum.CONTAINING) {
              placesPromise = this.props.childPlacesPromise.then(
                (childPlaces) => {
                  for (let placeType in childPlaces) {
                    if (
                      !config.placeTypes ||
                      config.placeTypes.includes(placeType)
                    ) {
                      // Choose the first 5 child places to show in the chart.
                      return childPlaces[placeType]
                        .slice(0, 5)
                        .map((place) => place["dcid"]);
                    }
                  }
                  return [];
                }
              );
            } else if (this.placeRelation == placeRelationEnum.SIMILAR) {
              placesPromise = this.props.similarPlacesPromise;
            } else if (this.placeRelation == placeRelationEnum.NEARBY) {
              placesPromise = this.props.nearbyPlacesPromise.then((data) => {
                return Object.keys(data);
              });
            }
            placesPromise.then((places) => {
              fetchStatsData(places, config.statsVars, perCapita, scaling).then(
                (data) => {
                  this.setState({
                    dataGroups: data.getPlaceGroupWithStatsVar(),
                  });
                }
              );
            });
            break;
          case axisEnum.TIME:
          // Fall-through;
          default:
            fetchStatsData([dcid], config.statsVars).then((data) => {
              this.setState({
                dataGroups: data.getTimeGroupWithStatsVar(dcid),
              });
            });
            break;
        }
        break;
      default:
        break;
    }
  }
}

export { Ranking, MainPane, Menu, ParentPlace, ChildPlace };
