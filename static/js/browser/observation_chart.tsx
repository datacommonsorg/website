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
 * Component for displaying a line chart for a single source series.
 */

import React from "react";

import { DataGroup } from "../chart/base";
import { drawLineChart } from "../chart/draw_line";
import { Series, StatMetadata } from "../shared/stat_types";
import { randDomId } from "../shared/util";
import { getUnit } from "../utils/stat_metadata_utils";

// Chart size
const HEIGHT = 220;

// Only show dots when there's only a single data point
const MAX_DOTS = 1;

interface ObservationChartPropType {
  series: Series;
  metadata: StatMetadata;
  idx: number;
  statVarId: string;
  placeDcid: string;
  statVarName?: string;
}

interface ObservationChartStateType {
  chartWidth: number;
  errorMessage: string;
  showTableView: boolean;
}

export class ObservationChart extends React.Component<
  ObservationChartPropType,
  ObservationChartStateType
> {
  private chartId: string;
  private chartContainerId: string;
  private svgContainerRef: React.RefObject<HTMLDivElement>;

  constructor(props: ObservationChartPropType) {
    super(props);
    this.state = {
      chartWidth: 0,
      errorMessage: "",
      showTableView: false,
    };
    this.chartId = randDomId();
    this.chartContainerId = this.chartId + "container";
    this.svgContainerRef = React.createRef();
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
  }

  componentDidMount(): void {
    window.addEventListener("resize", this._handleWindowResize);
    this.plot();
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  render(): JSX.Element {
    const svgContainerClass = `no-click${
      this.props.series.series.length > MAX_DOTS ? " hide-dots" : ""
    }`;
    const obsTableRowClass = "observation-table-row";
    const chartVisibility = this.state.showTableView ? "none" : "block";
    const tableVisibility = this.state.showTableView ? "block" : "none";
    const unit = getUnit(this.props.metadata);
    return (
      <>
        <button
          className="btn btn-sm btn-light chart-toggle"
          onClick={(): void =>
            this.setState({ showTableView: !this.state.showTableView })
          }
        >
          <i className="material-icons">
            {this.state.showTableView ? "show_chart" : "table_view"}
          </i>
          <span>{this.state.showTableView ? "show chart" : "show table"}</span>
        </button>
        <div className="observation-chart">
          <div id={this.chartContainerId} style={{ position: "relative" }}>
            <div style={{ display: tableVisibility }}>
              <div className="observations-table card p-0">
                <table className="node-table">
                  <tbody>
                    <tr key="header">
                      <td>
                        <strong>Date</strong>
                      </td>
                      <td>
                        <strong>
                          {this.props.statVarName
                            ? this.props.statVarName
                            : this.props.statVarId}
                        </strong>
                      </td>
                    </tr>
                    {this.props.series.series.map((obs) => {
                      return (
                        <tr className={obsTableRowClass} key={obs.date}>
                          <td>{obs.date}</td>
                          <td>{obs.value + unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div
              id={this.chartId}
              className={svgContainerClass}
              style={{ display: chartVisibility }}
              ref={this.svgContainerRef}
            />
          </div>
        </div>
      </>
    );
  }

  private _handleWindowResize(): void {
    if (this.svgContainerRef.current) {
      const width = this.svgContainerRef.current.offsetWidth;
      if (width !== this.state.chartWidth) {
        this.setState({
          chartWidth: width,
        });
        this.plot();
      }
    }
  }

  private plot(): void {
    this.svgContainerRef.current.innerHTML = "";
    const data = [];
    this.props.series.series.forEach((obs) => {
      data.push({
        label: obs.date,
        time: new Date(obs.date).getTime(),
        value: Number(obs.value),
      });
    });
    const dataGroups = [new DataGroup(this.props.statVarId, data)];
    drawLineChart(
      this.svgContainerRef.current,
      this.svgContainerRef.current.offsetWidth,
      HEIGHT,
      dataGroups,
      true,
      {
        handleDotClick: null,
        showAllDots: true,
        unit: getUnit(this.props.metadata),
      }
    );
  }
}
