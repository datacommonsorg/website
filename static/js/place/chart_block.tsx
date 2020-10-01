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
import { chartTypeEnum, ChartBlockData, Place } from "./types";
import { randDomId } from "../shared/util";
import { Chart } from "./chart";
import { displayNameForPlaceType, isPlaceInUsa } from "./util";
import _ from "lodash";

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
   * Parent places
   */
  parentPlaces: Place[];

  /**
   * Data for this chart block
   */
  data: ChartBlockData;
}

class ChartBlock extends React.Component<ChartBlockPropType, unknown> {
  constructor(props: ChartBlockPropType) {
    super(props);
  }

  render(): JSX.Element {
    let chartElements: JSX.Element[];
    // Plot trend data in overview and topic page.
    if (!_.isEmpty(this.props.data.trend)) {
      const id = randDomId();
      chartElements.push(
        <Chart
          key={id}
          id={id}
          dcid={this.props.dcid}
          placeType={this.props.placeType}
          chartType={chartTypeEnum.LINE}
          trend={this.props.data.trend}
          title={`${this.props.data.title} in ${this.props.placeName}`}
          unit={this.props.data.unit}
        ></Chart>
      );
    }

    // Only add comparison chart for US places.
    if (isPlaceInUsa(this.props.parentPlaces)) {
      const id = randDomId();
      // Prepare parameters for related charts.
      let unit = this.props.data.unit;
      if (this.props.data.relatedChart && this.props.data.relatedChart.scale) {
        unit = "%";
      }
      const chartType =
        this.props.data.statsVars.length == 1
          ? chartTypeEnum.STACK_BAR
          : chartTypeEnum.GROUP_BAR;
      const displayPlaceType = displayNameForPlaceType(
        this.props.placeType,
        true /* isPlural */
      ).toLocaleLowerCase();

      if (this.props.isOverview) {
        // Show child place(state) chart for USA page, otherwise show nearby
        // places.
        if (this.props.dcid == "country/USA") {
          chartElements.push(
            <Chart
              key={id}
              id={id}
              dcid={this.props.dcid}
              placeType={this.props.placeType}
              chartType={chartType}
              snapshot={this.props.data.child}
              title={`${this.props.data.title} across states within ${this.props.placeName}`}
              unit={unit}
            ></Chart>
          );
        } else {
          if (!_.isEmpty(this.props.data.nearby)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                dcid={this.props.dcid}
                placeType={this.props.placeType}
                chartType={chartType}
                snapshot={this.props.data.nearby}
                title={`${this.props.data.title} across ${displayPlaceType} near ${this.props.placeName}`}
                unit={unit}
              ></Chart>
            );
          }
        }
      } else {
        if (this.props.dcid != "country/USA") {
          if (!_.isEmpty(this.props.data.nearby)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                dcid={this.props.dcid}
                placeType={this.props.placeType}
                chartType={chartType}
                snapshot={this.props.data.nearby}
                title={`${this.props.data.title} across ${displayPlaceType} near ${this.props.placeName}`}
                unit={unit}
              ></Chart>
            );
          }
          if (!_.isEmpty(this.props.data.similar)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                dcid={this.props.dcid}
                placeType={this.props.placeType}
                chartType={chartType}
                snapshot={this.props.data.similar}
                title={`${this.props.data.title} across other ${displayPlaceType}`}
                unit={unit}
              ></Chart>
            );
          }
        }
        if (this.props.placeType !== "City") {
          // TODO(shifucun): Get the child place type in mixer.
          if (!_.isEmpty(this.props.data.child)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                dcid={this.props.dcid}
                placeType={this.props.placeType}
                chartType={chartType}
                snapshot={this.props.data.child}
                title={`${this.props.data.title} across places within ${this.props.placeName}`}
                unit={unit}
              ></Chart>
            );
          }
        } else {
          if (!_.isEmpty(this.props.data.parent)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                dcid={this.props.dcid}
                placeType={this.props.placeType}
                chartType={chartType}
                snapshot={this.props.data.parent}
                title={`${this.props.data.title} across places that contains ${this.props.placeName}`}
                unit={unit}
              ></Chart>
            );
          }
        }
      }
    }
    return <>chartElements</>;
  }
}

export { ChartBlock };
