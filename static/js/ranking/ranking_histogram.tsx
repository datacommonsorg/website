/**
 * Copyright 2023 Google LLC
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

import { DataPoint } from "../chart/base";
import { drawHistogram } from "../chart/draw";
import { CLASS_DC_CHART_HOLDER } from "../constants/css_constants";
import { formatNumber } from "../i18n/i18n";
import { randDomId } from "../shared/util";
import { RankInfo, Ranking } from "./ranking_types";

interface RankingHistogramPropType {
  ranking: Ranking;
  scaling: number;
  unit: string;
}

interface RankingHistogramStateType {
  elemWidth: number;
}

class RankingHistogram extends React.Component<
  RankingHistogramPropType,
  RankingHistogramStateType
> {
  chartElementRef: React.RefObject<HTMLDivElement>;
  info: RankInfo[];
  id: string;

  constructor(props: RankingHistogramPropType) {
    super(props);
    this.state = {
      elemWidth: 0,
    };
    // Always display the histogram from low to high rank
    this.info = [...this.props.ranking.info];
    this.info.sort((a, b) => {
      return a.rank - b.rank;
    });
    // Consider debouncing / throttling this if it gets expensive at
    // small screen sizes
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this.drawChart = this.drawChart.bind(this);
    this.chartElementRef = React.createRef();
    this.id = randDomId();
  }

  render(): JSX.Element {
    return (
      <div
        key={this.id}
        id={this.id}
        ref={this.chartElementRef}
        className={"chart-container " + CLASS_DC_CHART_HOLDER}
      ></div>
    );
  }

  drawChart(): void {
    const rankList = this.props.ranking.info;
    const dataPoints = rankList.map((d) => {
      const value = d.value || 0;
      return new DataPoint(d.placeName, value * this.props.scaling);
    });

    this.chartElementRef.current.innerHTML = "";
    drawHistogram(
      this.id,
      this.chartElementRef.current.offsetWidth,
      this.chartElementRef.current.offsetHeight,
      dataPoints,
      formatNumber,
      this.props.unit
    );
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this._handleWindowResize);
  }

  componentDidMount(): void {
    window.addEventListener("resize", this._handleWindowResize);
    this.drawChart();
  }

  componentDidUpdate(): void {
    this.drawChart();
  }

  _handleWindowResize(): void {
    const svgElement = document.getElementById(this.id);
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
