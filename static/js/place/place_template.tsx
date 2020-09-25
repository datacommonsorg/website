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

import React, { Component, createRef } from "react";
import axios from "axios";
import { DataPoint, DataGroup } from "../chart/base";

import { pluralizedDisplayNameForPlaceType, randDomId } from "../shared/util";
import {
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
} from "../chart/draw";
import { CachedStatVarDataMap, fetchStatsData } from "../shared/data_fetcher";
import { updatePageLayoutState } from "./place";
import { STATS_VAR_LABEL } from "../shared/stats_var_labels";

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
  chartType: string;
  statsVars: string[];
  denominator: string[];
  source: string;
  url: string;
  axis: string;
  scaling: number;
  perCapita: boolean;
  unit: string;
  exploreUrl: string;
  placeRelation?: string;
}

interface ChartCategory {
  label: string;
  charts: ConfigType[];
  children: { label: string; charts: ConfigType[] }[];
}

function displayNameForPlaceType(placeType: string): string {
  if (
    placeType.startsWith("AdministrativeArea") ||
    placeType.startsWith("Eurostat")
  ) {
    return "Place";
  }
  if (placeType === "CensusZipCodeTabulationArea") {
    return "Zip Code";
  }
  return placeType;
}

interface ParentPlacePropsType {
  parentPlaces: { dcid: string; name: string; types: string[] }[];
  placeType: string;
}

class ParentPlace extends Component<ParentPlacePropsType, unknown> {
  constructor(props: ParentPlacePropsType) {
    super(props);
  }

  render(): JSX.Element {
    const num = this.props.parentPlaces.length;
    return (
      <React.Fragment>
        <span>A {displayNameForPlaceType(this.props.placeType)} in </span>
        {this.props.parentPlaces.map((item, index) => {
          if (item.types[0] === "Continent") {
            return <span key={item.dcid}>{item.name}</span>;
          }
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
        })}
      </React.Fragment>
    );
  }

  _handleClick(dcid: string, e: Event): void {
    e.preventDefault();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    urlParams.set("dcid", dcid);
    window.location.search = urlParams.toString();
  }
}

interface RankingPropsType {
  dcid: string;
}

interface RankingStateType {
  data: {
    label: string[];
    Population: { name: Record<string, unknown>; label: string }[];
  };
}

class Ranking extends Component<RankingPropsType, RankingStateType> {
  constructor(props) {
    super(props);
    this.state = {
      data: { label: [], Population: [] },
    };
  }
  render() {
    const data = this.state.data;
    return (
      <React.Fragment>
        {data.label.length > 0 && (
          <React.Fragment>
            <table id="ranking-table" className="table">
              <thead>
                <tr>
                  <th scope="col">Rankings (in) </th>
                  {data[data.label[0]].map((item, index) => {
                    return (
                      <th scope="col" key={index}>
                        {item.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.label.map((item, index) => {
                  return (
                    <tr key={index}>
                      <th scope="row">{item}</th>
                      {data[item].map((rankingInfo) => {
                        const top = rankingInfo.data.rankFromTop;
                        const bottom = rankingInfo.data.rankFromBottom;
                        let text = "";
                        if (!isNaN(top) && !isNaN(bottom)) {
                          text = `${top} of ${top + bottom}`;
                        }
                        return (
                          <td key={text}>
                            <a href={rankingInfo.rankingUrl}>{text}</a>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="source">
              Data from <a href="https://www.census.gov/">census.gov</a>,{" "}
              <a href="https://www.fbi.gov/">fbi.gov</a> and{" "}
              <a href="https://www.bls.gov/">bls.gov</a>
            </div>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  componentDidMount() {
    axios.get(`/api/place/ranking/${this.props.dcid}`).then((resp) => {
      this.setState({ data: resp.data });
    });
  }
}

interface MenuPropsType {
  dcid: string;
  topic: string;
  chartConfig: ChartCategory[];
}

class Menu extends Component<MenuPropsType, unknown> {
  render(): JSX.Element {
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
            <React.Fragment key={item.label}>
              {item.children.length > 0 && (
                <li className="nav-item">
                  <a
                    href={`/place?dcid=${dcid}&topic=${item.label}`}
                    className={`nav-link ${
                      topic === item.label ? "active" : ""
                    }`}
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
              )}
            </React.Fragment>
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
   * The place name.
   */
  placeName: string;
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
   * An object from child place types to child places dcids.
   */
  childPlaces: { [key: string]: { dcid: string }[] };
  /**
   * Similar places dcids.
   */
  similarPlaces: string[];
  /**
   * Nearby places dcids.
   */
  nearbyPlaces: string[];
  /**
   * An object from statsvar dcid to the url tokens used by timeline tool.
   */
  chartConfig: ChartCategory[];
  /**
   * Cached stat var data for filling in charts.
   */
  chartData: CachedStatVarDataMap;
}

class MainPane extends Component<MainPanePropType, unknown> {
  constructor(props: MainPanePropType) {
    super(props);
  }

  render(): JSX.Element {
    let configData = [];
    const isOverview = !this.props.topic;
    if (isOverview) {
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
        {this.props.dcid.startsWith("geoId") && (
          // Only Show map and ranking for US places.
          <Overview topic={this.props.topic} dcid={this.props.dcid} />
        )}
        {configData.map((item, index) => {
          let subtopicHeader: JSX.Element;
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
                {item.charts.map((config: ConfigType, index) => {
                  return (
                    <ChartBlock
                      key={index}
                      isOverview={isOverview}
                      config={config}
                      dcid={this.props.dcid}
                      placeName={this.props.placeName}
                      placeType={this.props.placeType}
                      parentPlaces={this.props.parentPlaces}
                      childPlaces={this.props.childPlaces}
                      similarPlaces={this.props.similarPlaces}
                      nearbyPlaces={this.props.nearbyPlaces}
                      chartData={this.props.chartData}
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

class Overview extends Component<OverviewPropType, unknown> {
  render() {
    if (!this.props.topic) {
      return (
        <React.Fragment>
          <section className="factoid col-12">
            <div className="row">
              <div className="col-12 col-md-4">
                <Map dcid={this.props.dcid}></Map>
              </div>
              <div className="col-12 col-md-8">
                <Ranking dcid={this.props.dcid}></Ranking>
              </div>
            </div>
          </section>
        </React.Fragment>
      );
    }
    return <React.Fragment></React.Fragment>;
  }
}

interface ChildPlacePropType {
  childPlaces: { string: { dcid: string; name: string }[] };
  placeName: string;
}

class ChildPlace extends Component<ChildPlacePropType, unknown> {
  render(): JSX.Element {
    if (Object.keys(this.props.childPlaces).length === 0) {
      return <React.Fragment></React.Fragment>;
    }
    return (
      <React.Fragment>
        <span id="child-place-head">Places in {this.props.placeName}</span>
        {Object.keys(this.props.childPlaces).map((placeType) => (
          <div key={placeType} className="child-place-group">
            <div className="child-place-type">
              {pluralizedDisplayNameForPlaceType(placeType)}
            </div>
            {this.props.childPlaces[placeType]
              .sort((a, b) => a.name > b.name)
              .map((place, i) => (
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

interface ChartBlockPropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The place name.
   */
  placeName: string;
  /**
   * The place type.
   */
  placeType: string;
  /**
   * If the chart block is in overview page.
   */
  isOverview: boolean;
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
   * The child places keyed by place types.
   */
  childPlaces: { [key: string]: { dcid: string }[] };
  /**
   * The similar places.
   */
  similarPlaces: string[];
  /**
   * The nearby places.
   */
  nearbyPlaces: string[];
  /**
   * Cached stat var data for filling in charts.
   */
  chartData: CachedStatVarDataMap;
}

// TODO(shifucun): Create new file for Chart related componenets.
class ChartBlock extends Component<ChartBlockPropType, unknown> {
  constructor(props: ChartBlockPropType) {
    super(props);
  }

  render() {
    const configList = this.props.isOverview
      ? this.buildOverviewConfig(this.props.placeType, this.props.config)
      : this.buildTopicConfig(
          this.props.placeName,
          this.props.placeType,
          this.props.config
        );
    return (
      <>
        {configList.map((item) => {
          const id = randDomId();
          return (
            <Chart
              key={id}
              id={id}
              config={item}
              dcid={this.props.dcid}
              placeType={this.props.placeType}
              parentPlaces={this.props.parentPlaces}
              childPlaces={this.props.childPlaces}
              similarPlaces={this.props.similarPlaces}
              nearbyPlaces={this.props.nearbyPlaces}
              chartData={this.props.chartData}
            />
          );
        })}
      </>
    );
  }

  // TODO(shifucun): Add more config to indicate whether to use perCapita for
  // place comparison.
  private buildOverviewConfig(
    placeType: string,
    config: ConfigType
  ): ConfigType[] {
    const result = [];
    let conf = { ...config };
    conf.chartType = chartTypeEnum.LINE;
    conf.title = conf.title + " in " + this.props.placeName;
    result.push(conf);

    conf = { ...config };
    conf.chartType = chartTypeEnum.GROUP_BAR;
    conf.axis = "PLACE";
    if (placeType === "Country") {
      // Containing place chart
      conf.title = conf.title + " for places within " + this.props.placeName;
      conf.placeRelation = placeRelationEnum.CONTAINING;
    } else {
      conf.title = conf.title + " for places near " + this.props.placeName;
      conf.placeRelation = placeRelationEnum.NEARBY;
    }
    result.push(conf);
    return result;
  }

  private buildTopicConfig(
    placeName: string,
    placeType: string,
    config: ConfigType
  ) {
    const result: ConfigType[] = [];
    let conf = { ...config };
    conf.chartType = chartTypeEnum.LINE;
    conf.title = conf.title + " in " + this.props.placeName;
    result.push(conf);

    if (placeType !== "Country") {
      const displayPlaceType = pluralizedDisplayNameForPlaceType(
        placeType
      ).toLocaleLowerCase();
      // Nearby places
      conf = { ...config };
      conf.chartType = chartTypeEnum.GROUP_BAR;
      conf.placeRelation = placeRelationEnum.NEARBY;
      conf.axis = "PLACE";
      conf.title = `${conf.title} for ${displayPlaceType} near ${this.props.placeName}`;
      result.push(conf);
      // Similar places
      conf = { ...config };
      conf.chartType = chartTypeEnum.GROUP_BAR;
      conf.placeRelation = placeRelationEnum.SIMILAR;
      conf.axis = "PLACE";
      conf.title = `${conf.title} for other ${displayPlaceType}`;
      result.push(conf);
    }
    if (placeType !== "City") {
      // Children places
      conf = { ...config };
      conf.chartType = chartTypeEnum.GROUP_BAR;
      conf.placeRelation = placeRelationEnum.CONTAINING;
      conf.axis = "PLACE";
      conf.title = conf.title + " for places within " + this.props.placeName;
      result.push(conf);
    } else {
      // Parent places.
      // TODO(shifucun): Add perCapita option if appropriate, this should be
      // based on the chart config.
      conf = { ...config };
      conf.chartType = chartTypeEnum.GROUP_BAR;
      conf.placeRelation = placeRelationEnum.CONTAINED;
      conf.axis = "PLACE";
      conf.title =
        conf.title + " for places that contain " + this.props.placeName;
      result.push(conf);
    }
    return result;
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
   * The child places keyed by place type.
   */
  childPlaces: { [key: string]: { dcid: string }[] };
  /**
   * The similar places.
   */
  similarPlaces: string[];
  /**
   * The nearby places.
   */
  nearbyPlaces: string[];
  /**
   * Cached stat var data for filling in charts.
   */
  chartData: CachedStatVarDataMap;
}

interface ChartStateType {
  dataPoints?: DataPoint[];
  dataGroups?: DataGroup[];
  elemWidth: number;
  dateSelected?: string;
  sources: string[];
  display: boolean;
}

class Chart extends Component<ChartPropType, ChartStateType> {
  chartElement: React.RefObject<HTMLDivElement>;
  similarRef: React.RefObject<HTMLOptionElement>;
  nearbyRef: React.RefObject<HTMLOptionElement>;
  parentRef: React.RefObject<HTMLOptionElement>;
  childrenRef: React.RefObject<HTMLOptionElement>;
  dcid: string;
  placeRelation: string;

  constructor(props: ChartPropType) {
    super(props);
    this.chartElement = createRef();
    this.similarRef = createRef();
    this.nearbyRef = createRef();
    this.parentRef = createRef();
    this.childrenRef = createRef();

    this.state = {
      elemWidth: 0,
      sources: [],
      display: true,
    };
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this.dcid = props.dcid;
  }

  showParent() {
    return (
      this.props.parentPlaces.length > 0 &&
      !CONTINENTS.has(this.props.parentPlaces[0].dcid)
    );
  }

  render() {
    if (!this.state.display) {
      return "";
    }
    const config = this.props.config;
    const dateString = this.state.dateSelected
      ? "(" + this.state.dateSelected + ")"
      : "";
    if (
      this.props.config.placeRelation === placeRelationEnum.CONTAINED &&
      this.props.parentPlaces.length === 0
    ) {
      return "";
    }
    if (
      this.props.config.placeRelation === placeRelationEnum.CONTAINING &&
      Object.keys(this.props.childPlaces).length === 0
    ) {
      return "";
    }
    if (
      this.props.config.placeRelation === placeRelationEnum.SIMILAR &&
      this.props.similarPlaces.length === 1
    ) {
      return "";
    }
    return (
      <div className="col" ref={this.chartElement}>
        <div className="chart-container">
          <h4>
            {config.title}
            <span className="sub-title">{dateString}</span>
          </h4>
          <div id={this.props.id} className="svg-container"></div>
          <footer className="row explore-more-container">
            <div>
              <span>Data from </span>
              {this.state.sources.map((source, index) => {
                // TDOO(shifucun): Use provenance name and url from cache data
                // https://github.com/datacommonsorg/website/issues/429
                return (
                  <span key={source}>
                    <a href={"https://" + source}>{source}</a>
                    {index < this.state.sources.length - 1 ? ", " : ""}
                  </span>
                );
              })}
              <span className="dotted-warning d-none">
                {" "}
                (dotted line denotes missing data)
              </span>
            </div>
            <div>
              <a
                target="_blank"
                rel="noreferrer"
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
    if (!this.state.display) {
      return;
    }
    const dp = this.state.dataPoints;
    const dg = this.state.dataGroups;
    if (
      (dp && dp.length === 0) ||
      (dg &&
        (dg.length === 0 || (dg.length === 1 && dg[0].value.length === 0))) ||
      (this.props.config.chartType == "LINE" &&
        dg &&
        dg.length === 1 &&
        dg[0].value.length === 1)
    ) {
      // When there is no data, do not show the current chart.
      console.log(
        `no data for ${this.props.dcid}: ${this.props.config.statsVars}`
      );
      this.setState({
        display: false,
      });
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
    this.fetchData();
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

  drawChart() {
    const chartType = this.props.config.chartType;
    const elem = document.getElementById(this.props.id);
    elem.innerHTML = "";
    if (chartType === chartTypeEnum.LINE) {
      const isCompleteLine = drawLineChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.config.unit
      );
      if (!isCompleteLine) {
        this.chartElement.current!.querySelectorAll(
          ".dotted-warning"
        )[0].className += " d-inline";
      }
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
        fetchStatsData(
          [dcid],
          config.statsVars,
          perCapita,
          scaling,
          config.denominator,
          this.props.chartData
        ).then((data) => {
          const dataGroups = data.getStatsVarGroupWithTime(dcid);
          for (const dataGroup of dataGroups) {
            dataGroup.label = STATS_VAR_LABEL[dataGroup.label];
          }
          this.setState({
            dataGroups,
            sources: Array.from(data.sources),
          });
        });
        break;
      case chartTypeEnum.SINGLE_BAR:
        fetchStatsData(
          [dcid],
          config.statsVars,
          perCapita,
          scaling,
          config.denominator,
          this.props.chartData
        ).then((data) => {
          this.setState({
            dataPoints: data.getStatsPoint(dcid),
            dateSelected: data.latestCommonDate,
            sources: Array.from(data.sources),
          });
        });
        break;
      case chartTypeEnum.GROUP_BAR:
      // Fall-through
      case chartTypeEnum.STACK_BAR:
        switch (config.axis) {
          case axisEnum.PLACE: {
            let places: string[];
            if (
              this.props.config.placeRelation === placeRelationEnum.CONTAINED
            ) {
              places = [
                dcid,
                ...this.props.parentPlaces.map((parent) => parent.dcid),
              ];
            } else if (
              this.props.config.placeRelation === placeRelationEnum.CONTAINING
            ) {
              // Choose the place type that has the highest average
              // population
              let avgPop = 0;
              for (const placeType in this.props.childPlaces) {
                const children = this.props.childPlaces[placeType];
                const pop =
                  children
                    .map((place) => place["pop"])
                    .reduce(function (a, b) {
                      return a + b;
                    }, 0) / children.length;
                if (pop > avgPop) {
                  avgPop = pop;
                  places = children.slice(0, 5).map((place) => place.dcid);
                }
              }
            } else if (
              this.props.config.placeRelation === placeRelationEnum.SIMILAR
            ) {
              places = this.props.similarPlaces;
            } else if (
              this.props.config.placeRelation === placeRelationEnum.NEARBY
            ) {
              places = this.props.nearbyPlaces;
            }
            fetchStatsData(
              places,
              config.statsVars,
              perCapita,
              scaling,
              config.denominator,
              this.props.chartData
            ).then((data) => {
              this.setState({
                dataGroups: data.getPlaceGroupWithStatsVar(
                  null,
                  (dcid) => `/place?dcid=${dcid}`
                ),
                dateSelected: data.latestCommonDate,
                sources: Array.from(data.sources),
              });
            });
            break;
          }
          case axisEnum.TIME:
          // Fall-through;
          default:
            fetchStatsData(
              [dcid],
              config.statsVars,
              perCapita,
              scaling,
              config.denominator,
              this.props.chartData
            ).then((data) => {
              this.setState({
                dataGroups: data.getTimeGroupWithStatsVar(dcid),
                sources: Array.from(data.sources),
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

interface MapPropType {
  /**
   * The place dcid.
   */
  dcid: string;
}

class Map extends Component<MapPropType, unknown> {
  div: React.RefObject<HTMLDivElement>;

  constructor(props) {
    super(props);
    this.div = createRef();
  }
  render() {
    return <div id="map-container" ref={this.div}></div>;
  }

  componentDidMount() {
    axios.get(`/api/place/mapinfo/${this.props.dcid}`).then(
      function (resp) {
        const mapInfo = resp.data;
        if (!mapInfo || Object.keys(mapInfo).length === 0) return;
        const mapOptions = {
          mapTypeControl: false,
          draggable: true,
          scaleControl: true,
          scrollwheel: true,
          navigationControl: true,
          streetViewControl: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        };
        const map = new google.maps.Map(this.div.current, mapOptions);

        // Map bounds.
        const sw = new google.maps.LatLng(mapInfo.down, mapInfo.left);
        const ne = new google.maps.LatLng(mapInfo.up, mapInfo.right);
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(sw);
        bounds.extend(ne);
        map.fitBounds(bounds);

        // Polygons of the place.
        if (mapInfo.coordinateSequenceSet) {
          for (const coordinateSequence of mapInfo.coordinateSequenceSet) {
            const polygon = new google.maps.Polygon({
              paths: coordinateSequence,
              strokeColor: "#FF0000",
              strokeOpacity: 0.6,
              strokeWeight: 1,
              fillOpacity: 0.15,
            });
            polygon.setMap(map);
          }
        }
      }.bind(this)
    );
  }
}

export { MainPane, Menu, ParentPlace, ChildPlace };
