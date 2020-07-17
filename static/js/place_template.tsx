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
import { fetchStatsData } from "./data_fetcher";
import { updatePageLayoutState } from "./place";
import { STATS_VAR_TEXT } from "./stats_var";

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

const CONTINENTS = new Set([
  "africa",
  "antarctica",
  "northamerica",
  "oceania",
  "europe",
  "asia",
  "southamerica",
]);

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
  scaling: number;
  perCapita: boolean;
  unit: string;
  exploreUrl: string;
}

interface ChartCategory {
  label: string;
  charts: ConfigType[];
  children: { label: string; charts: ConfigType[] }[];
}

interface ParentPlacePropsType {
  parentPlaces: { dcid: string; name: string }[];
}

class ParentPlace extends Component<ParentPlacePropsType, {}> {
  constructor(props) {
    super(props);
  }
  render() {
    const num = this.props.parentPlaces.length;
    return this.props.parentPlaces.map((item, index) => {
      return (
        <React.Fragment key={item.dcid}>
          <a
            className="place-links"
            href="#"
            onClick={this._handleClick.bind(this, item.dcid)}
          >
            {item.name}
          </a>
          {index < num - 1 && <span>, </span>}
        </React.Fragment>
      );
    });
  }

  _handleClick(dcid, e) {
    e.preventDefault();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    urlParams.set("dcid", dcid);
    window.location.search = urlParams.toString();
  }
}

interface RankingPropsType {
  data: {
    label: string[];
    Population: { name: {}; label: string }[];
  };
}

// tslint:disable-next-line: max-classes-per-file
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
            {this.props.data.Population.map((item, index) => {
              return (
                <th scope="col" key={index}>
                  {item.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {this.props.data.label.map((item, index) => {
            return (
              <tr key={index}>
                <th scope="row">{item}</th>
                {this.props.data[item].map((rankingInfo) => {
                  const top = rankingInfo.data.rankFromTop;
                  const bottom = rankingInfo.data.rankFromBottom;
                  let text = "";
                  if (!isNaN(top) && !isNaN(bottom)) {
                    text = `${top} of ${top + bottom}`;
                  }
                  return <td key={text}>{text}</td>;
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
  chartConfig: ChartCategory[];
}

// tslint:disable-next-line: max-classes-per-file
class Menu extends Component<MenuPropsType, {}> {
  render() {
    const dcid = this.props.dcid;
    const topic = this.props.topic;
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
        {this.props.chartConfig.map((item: ChartCategory) => {
          return (
            <li className="nav-item" key={item.label}>
              <a
                href={`/place?dcid=${dcid}&topic=${item.label}`}
                className={`nav-link ${topic === item.label ? "active" : ""}`}
              >
                {item.label}
              </a>
              <ul
                className={
                  "nav flex-column ml-3 " +
                  (item.label !== topic ? "collapse" : "")
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
        })}
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
  childPlacesPromise: Promise<{ [key: string]: { dcid: string }[] }>;
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
  chartConfig: ChartCategory[];
}

class MainPane extends Component<MainPanePropType, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    let configData = [];
    const isOverview = !this.props.topic;
    if (!this.props.topic) {
      configData = this.props.chartConfig;
    } else {
      for (const group of this.props.chartConfig) {
        if (group.label === this.props.topic) {
          configData = group.children;
          break;
        }
      }
    }
    return (
      <React.Fragment>
        {!["Country", "Continent"].includes(this.props.placeType) && (
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
                {item.charts.map((config: ConfigType) => {
                  const id = randDomId();
                  return (
                    <Chart
                      key={id}
                      id={id}
                      config={config}
                      dcid={this.props.dcid}
                      placeType={this.props.placeType}
                      parentPlaces={this.props.parentPlaces}
                      childPlacesPromise={this.props.childPlacesPromise}
                      similarPlacesPromise={this.props.similarPlacesPromise}
                      nearbyPlacesPromise={this.props.nearbyPlacesPromise}
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
    if (!this.props.topic) {
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
    if (Object.keys(this.props.childPlaces).length === 0) {
      return "";
    }
    return (
      <React.Fragment>
        {Object.keys(this.props.childPlaces).map((placeType) => (
          <div key={placeType}>
            <div className="child-place-type">{pluralize(placeType)}</div>
            {this.props.childPlaces[placeType].map((place, i) => (
              <a
                key={place.dcid}
                className="child-place-link"
                href={"/place?dcid=" + place.dcid}
              >
                {place.name}
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
   * The place type.
   */
  placeType: string;
  /**
   * An object of the chart config.
   */
  config: ConfigType;
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
  childPlacesPromise: Promise<{ [key: string]: { dcid: string }[] }>;
  /**
   * The similar places promise.
   */
  similarPlacesPromise: Promise<{ dcid: string; name: string }>;
  /**
   * The nearby places promise.
   */
  nearbyPlacesPromise: Promise<{ dcid: string; name: string }>;
}

interface ChartStateType {
  dataPoints?: DataPoint[];
  dataGroups?: DataGroup[];
  elemWidth: number;
}

class Chart extends Component<ChartPropType, ChartStateType> {
  chartElement: React.RefObject<HTMLDivElement>;
  similarRef: React.RefObject<HTMLOptionElement>;
  nearbyRef: React.RefObject<HTMLOptionElement>;
  parentRef: React.RefObject<HTMLOptionElement>;
  childrenRef: React.RefObject<HTMLOptionElement>;
  dcid: string;
  titleSuffix: string;
  placeRelation: string;

  constructor(props) {
    super(props);
    this.chartElement = React.createRef();
    this.similarRef = React.createRef();
    this.nearbyRef = React.createRef();
    this.parentRef = React.createRef();
    this.childrenRef = React.createRef();

    this.state = {
      elemWidth: 0,
    };
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this._handlePlaceSelection = this._handlePlaceSelection.bind(this);
    this.dcid = props.dcid;
    this.titleSuffix = "";
    // Default use similar places.
    if (this.props.placeType === "Country") {
      this.placeRelation = placeRelationEnum.CONTAINING;
    } else {
      this.placeRelation = placeRelationEnum.SIMILAR;
    }
  }

  showParent() {
    return (
      this.props.parentPlaces.length > 0 &&
      !CONTINENTS.has(this.props.parentPlaces[0].dcid)
    );
  }

  render() {
    const config = this.props.config;
    return (
      <div className="col" ref={this.chartElement}>
        <div className="chart-container">
          <h4>
            {config.title}
            <span className="sub-title">{this.titleSuffix}</span>
          </h4>
          {config.axis === axisEnum.PLACE && (
            <label>
              Choose places:{" "}
              <select
                value={this.placeRelation}
                onChange={this._handlePlaceSelection}
              >
                <option value="SIMILAR" ref={this.similarRef}>
                  simliar
                </option>
                {this.showParent() && (
                  <option value="CONTAINED" ref={this.parentRef}>
                    contained
                  </option>
                )}
                <option value="CONTAINING" ref={this.childrenRef}>
                  containing
                </option>
                <option value="NEARBY" ref={this.nearbyRef}>
                  nearby
                </option>
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
                href={config.exploreUrl}
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
      (dp && dp.length === 0) ||
      (dg && (dg.length === 0 || (dg.length === 1 && dg[0].value.length === 0)))
    ) {
      alert("No data for selection");
      return;
    }
    // Draw chart.
    try {
      this.drawChart();
    } catch (e) {
      return;
    }
    updatePageLayoutState();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount() {
    window.addEventListener("resize", this._handleWindowResize);
    Promise.all([
      this.props.similarPlacesPromise,
      this.props.childPlacesPromise,
      this.props.nearbyPlacesPromise,
    ]).then((values) => {
      if (this.childrenRef.current && Object.keys(values[1]).length === 0) {
        this.childrenRef.current.style.display = "none";
        this.placeRelation = placeRelationEnum.SIMILAR;
      }
      if (this.nearbyRef.current && Object.keys(values[2]).length === 0) {
        this.nearbyRef.current.style.display = "none";
      }
      if (this.similarRef.current && Object.keys(values[0]).length === 0) {
        this.similarRef.current.style.display = "none";
      }
      this.fetchData();
    });
  }

  _handleWindowResize() {
    const svgElement = document.getElementById(this.props.id);
    if (!svgElement) {
      return;
    }
    // Chart resizes at bootstrap breakpoints
    const width = svgElement.offsetWidth;
    if (width !== this.state.elemWidth) {
      this.setState({
        elemWidth: width,
      });
    }
  }

  _handlePlaceSelection(event) {
    this.placeRelation = event.target.value;
    this.fetchData();
  }

  drawChart() {
    const chartType = this.props.config.chartType;
    const elem = document.getElementById(this.props.id);
    elem.innerHTML = "";
    if (chartType === chartTypeEnum.LINE) {
      drawLineChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.config.unit
      );
    } else if (chartType === chartTypeEnum.SINGLE_BAR) {
      drawSingleBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataPoints,
        this.props.config.unit
      );
    } else if (chartType === chartTypeEnum.STACK_BAR) {
      drawStackBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.config.unit
      );
    } else if (chartType === chartTypeEnum.GROUP_BAR) {
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
    const dcid = this.dcid;
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
          const dataGroups = data.getStatsVarGroupWithTime(dcid);
          for (const dataGroup of dataGroups) {
            dataGroup.label = STATS_VAR_TEXT[dataGroup.label];
          }
          this.setState({
            dataGroups,
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
            if (this.placeRelation === placeRelationEnum.CONTAINED) {
              placesPromise = Promise.resolve([
                dcid,
                ...this.props.parentPlaces.map((parent) => parent.dcid),
              ]);
            } else if (this.placeRelation === placeRelationEnum.CONTAINING) {
              placesPromise = this.props.childPlacesPromise.then(
                (childPlaces) => {
                  // TODO(boxu): figure out a better way to pick child places.
                  for (const placeType in childPlaces) {
                    if (childPlaces.hasOwnProperty(placeType)) {
                      return childPlaces[placeType]
                        .slice(0, 5)
                        .map((place) => place.dcid);
                    }
                  }
                }
              );
            } else if (this.placeRelation === placeRelationEnum.SIMILAR) {
              placesPromise = this.props.similarPlacesPromise;
            } else if (this.placeRelation === placeRelationEnum.NEARBY) {
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
