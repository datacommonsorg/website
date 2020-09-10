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
import { Ranking, RankInfo } from "./ranking_types";
import * as d3 from "d3";
import { DataPoint } from "../chart/base";
import { drawHistogram } from "../chart/draw";

interface RankingHistogramPropType {
  ranking: Ranking;
  id: string;
}

interface RankingHistogramStateType {
  elemWidth: number;
}

class RankingHistogram extends Component<
  RankingHistogramPropType,
  RankingHistogramStateType
> {
  chartElement: React.RefObject<HTMLDivElement>;

  constructor(props: RankingHistogramPropType) {
    super(props);
    this.state = {
      elemWidth: 0,
    };
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this.drawChart = this.drawChart.bind(this);
    this.chartElement = createRef();
  }

  render(): JSX.Element {
    return (
      <div
        key={this.props.id}
        id={this.props.id}
        ref={this.chartElement}
        className="chart-container"
      ></div>
    );
  }

  drawChart() {
    const rankList = this.props.ranking.info;
    const dataPoints = rankList.map((d) => new DataPoint(d.placeName, d.value));

    const elem = document.getElementById(this.props.id);
    elem.innerHTML = "";
    drawHistogram(
      this.props.id,
      elem.offsetWidth,
      elem.offsetHeight,
      dataPoints
    );
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount() {
    window.addEventListener("resize", this._handleWindowResize);
    this.drawChart();
  }

  componentDidUpdate() {
    this.drawChart();
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
}

export { RankingHistogram };
