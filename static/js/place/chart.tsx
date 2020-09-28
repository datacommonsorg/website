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
import { DataPoint, DataGroup } from "../chart/base";
import {
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
} from "../chart/draw";
import { CachedStatVarDataMap, fetchStatsData } from "../shared/data_fetcher";
import { STATS_VAR_LABEL } from "../shared/stats_var_labels";
import {
  CONTINENTS,
  ConfigType,
  axisEnum,
  chartTypeEnum,
  childPlacesType,
  parentPlacesType,
  placeRelationEnum,
} from "./types";
import { updatePageLayoutState } from "./place";

const CHART_HEIGHT = 194;

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
  parentPlaces: parentPlacesType;
  /**
   * The child places keyed by place type.
   */
  childPlaces: childPlacesType;
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

  showParent(): boolean {
    return (
      this.props.parentPlaces.length > 0 &&
      !CONTINENTS.has(this.props.parentPlaces[0].dcid)
    );
  }

  render(): JSX.Element {
    if (!this.state.display) {
      return null;
    }
    const config = this.props.config;
    const dateString = this.state.dateSelected
      ? "(" + this.state.dateSelected + ")"
      : "";
    if (
      this.props.config.placeRelation === placeRelationEnum.CONTAINED &&
      this.props.parentPlaces.length === 0
    ) {
      return null;
    }
    if (
      this.props.config.placeRelation === placeRelationEnum.CONTAINING &&
      Object.keys(this.props.childPlaces).length === 0
    ) {
      return null;
    }
    if (
      this.props.config.placeRelation === placeRelationEnum.SIMILAR &&
      this.props.similarPlaces.length === 1
    ) {
      return null;
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

  componentDidUpdate(): void {
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
        dg.reduce((accum, group) => {
          return accum || group.value.length === 1;
        }, false)) ||
      (this.props.config.placeRelation === placeRelationEnum.CONTAINED &&
        dg &&
        dg.length === 1)
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

  componentWillUnmount(): void {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount(): void {
    window.addEventListener("resize", this._handleWindowResize);
    this.fetchData();
  }

  _handleWindowResize(): void {
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

  drawChart(): void {
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
        this.chartElement.current.querySelectorAll(
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

  async fetchData(): Promise<void> {
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

export { Chart };
