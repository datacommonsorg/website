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

import React from "react";
import { DataPoint, DataGroup, dataGroupsToCsv } from "../chart/base";
import {
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
} from "../chart/draw";
import { STATS_VAR_LABEL } from "../shared/stats_var_labels";
import { chartTypeEnum, TrendData, SnapshotData } from "./types";
import { updatePageLayoutState } from "./place";
import { ChartEmbed } from "./chart_embed";

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
   * The chart title
   */
  title: string;
  /**
   * Time series data
   */
  trend?: TrendData;
  /**
   * Snapshot data
   */
  snapshot?: SnapshotData;
  /**
   * The chart type, could be line, single bar or group bar chart.
   */
  chartType: string;
  /**
   * The unit of stat value
   */
  unit: string;
  /**
   * All place names
   */
  names: { [key: string]: string };
  /**
   * Scale number
   */
  scaling?: number;
  /**
   * All stats vars for this chart
   */
  statsVars: string[];
}

interface ChartStateType {
  dataPoints?: DataPoint[];
  dataGroups?: DataGroup[];
  elemWidth: number;
  display: boolean;
  showModal: boolean;
}

class Chart extends React.Component<ChartPropType, ChartStateType> {
  chartElement: React.RefObject<HTMLDivElement>;
  svgContainerElement: React.RefObject<HTMLDivElement>;
  embedModalElement: React.RefObject<ChartEmbed>;
  dcid: string;

  constructor(props: ChartPropType) {
    super(props);
    this.chartElement = React.createRef();
    this.svgContainerElement = React.createRef();
    this.embedModalElement = React.createRef();

    this.state = {
      display: true,
      elemWidth: 0,
      showModal: false,
    };
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this._handleEmbed = this._handleEmbed.bind(this);
  }

  render(): JSX.Element {
    if (!this.state.display) {
      return null;
    }
    const dateString = this.props.snapshot
      ? "(" + this.props.snapshot.date + ")"
      : "";
    const sources = this.props.trend
      ? this.props.trend.sources
      : this.props.snapshot.sources;
    const exploreUrl = this.props.trend
      ? this.props.trend.exploreUrl
      : this.props.snapshot.exploreUrl;
    return (
      <div className="col">
        <div className="chart-container" ref={this.chartElement}>
          <h4>
            {this.props.title}
            <span className="sub-title">{dateString}</span>
          </h4>
          <div
            id={this.props.id}
            ref={this.svgContainerElement}
            className="svg-container"
          ></div>
          <footer className="row explore-more-container">
            <div>
              <span>Data from </span>
              {sources.map((source, index) => {
                // TDOO(shifucun): Use provenance name and url from cache data
                // https://github.com/datacommonsorg/website/issues/429
                return (
                  <span key={source}>
                    <a href={"https://" + source}>{source}</a>
                    {index < sources.length - 1 ? ", " : ""}
                  </span>
                );
              })}
              <span className="dotted-warning d-none">
                {" "}
                (dotted line denotes missing data)
              </span>
            </div>
            <div className="outlinks">
              <a href="#" onClick={this._handleEmbed}>
                Export
              </a>
              <a className="explore-more" href={exploreUrl}>
                Explore More ›
              </a>
            </div>
          </footer>
        </div>
        <ChartEmbed ref={this.embedModalElement} />
      </div>
    );
  }

  componentDidUpdate(): void {
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
    this.processData();
  }

  private _handleWindowResize(): void {
    const svgElement = this.svgContainerElement.current;
    if (!svgElement) {
      return;
    }
    // Chart resizes at bootstrap breakpoints
    const width = this.svgContainerElement.current.offsetWidth;
    if (width !== this.state.elemWidth) {
      this.setState({
        elemWidth: width,
      });
    }
  }

  /**
   * Returns data used to draw chart as a CSV.
   */
  private dataCsv(): string {
    // TODO(beets): Handle this.state.dataPoints too.
    const dp = this.state.dataPoints;
    if (dp && dp.length > 0) {
      console.log("Implement CSV function for data points");
      return;
    }
    return dataGroupsToCsv(this.state.dataGroups);
  }

  /**
   * Handle clicks on "embed chart" link.
   */
  private _handleEmbed(
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ): void {
    e.preventDefault();
    const svgElems = this.svgContainerElement.current.getElementsByTagName(
      "svg"
    );
    let svgXml: string;
    if (svgElems.length) {
      svgXml = svgElems.item(0).outerHTML;
    }
    this.embedModalElement.current.show(
      svgXml,
      this.dataCsv(),
      this.svgContainerElement.current.offsetWidth,
      CHART_HEIGHT,
      this.props.title,
      this.props.snapshot ? this.props.snapshot.date : "",
      this.props.snapshot ? this.props.snapshot.sources : []
    );
  }

  drawChart(): void {
    const chartType = this.props.chartType;
    const elem = document.getElementById(this.props.id);
    elem.innerHTML = "";
    if (chartType === chartTypeEnum.LINE) {
      const isCompleteLine = drawLineChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.unit
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
        this.props.unit
      );
    } else if (chartType === chartTypeEnum.STACK_BAR) {
      drawStackBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.unit
      );
    } else if (chartType === chartTypeEnum.GROUP_BAR) {
      drawGroupBarChart(
        this.props.id,
        elem.offsetWidth,
        CHART_HEIGHT,
        this.state.dataGroups,
        this.props.unit
      );
    }
  }

  private expandDataPoints(
    dataPoints: DataPoint[],
    dates: Set<string>
  ): DataPoint[] {
    const result: DataPoint[] = dataPoints;
    for (const dp of dataPoints) {
      if (dates.has(dp.label)) {
        dates.delete(dp.label);
      }
    }
    dates.forEach((date) => {
      result.push({ label: date, value: null });
    });

    result.sort(function (a, b) {
      return a.label > b.label ? -1 : 1;
    });
    return result;
  }

  private processData(): void {
    const dataGroups: DataGroup[] = [];
    const dataPoints: DataPoint[] = [];
    const allDates = new Set<string>();
    const scaling = this.props.scaling ? this.props.scaling : 1;
    switch (this.props.chartType) {
      case chartTypeEnum.LINE:
        for (const statVar in this.props.trend.series) {
          const dataPoints: DataPoint[] = [];
          for (const date in this.props.trend.series[statVar]) {
            allDates.add(date);
            dataPoints.push({
              label: date,
              value: this.props.trend.series[statVar][date] * scaling,
            });
          }
          dataGroups.push(new DataGroup(STATS_VAR_LABEL[statVar], dataPoints));
        }
        for (let i = 0; i < dataGroups.length; i++) {
          dataGroups[i].value = this.expandDataPoints(
            dataGroups[i].value,
            allDates
          );
        }
        this.setState({
          dataGroups,
        });
        break;
      case chartTypeEnum.SINGLE_BAR:
        const snapshotData = this.props.snapshot.data[0];
        for (const statVar in snapshotData.data) {
          dataPoints.push({
            label: STATS_VAR_LABEL[statVar],
            value: snapshotData.data[statVar] * scaling,
            dcid: snapshotData.dcid,
          });
        }
        this.setState({
          dataPoints,
        });
        break;
      case chartTypeEnum.GROUP_BAR:
      // Fall-through
      case chartTypeEnum.STACK_BAR:
        for (const placeData of this.props.snapshot.data) {
          const dataPoints: DataPoint[] = [];
          for (const statVar of this.props.statsVars) {
            const val = placeData.data[statVar];
            dataPoints.push({
              label: STATS_VAR_LABEL[statVar],
              value: val ? val * scaling : null,
              dcid: placeData.dcid,
            });
          }
          dataGroups.push(
            new DataGroup(
              this.props.names[placeData.dcid],
              dataPoints,
              `/place?dcid=${placeData.dcid}`
            )
          );
        }
        this.setState({
          dataGroups: dataGroups,
        });
        break;
      default:
        break;
    }
  }
}

export { Chart };
