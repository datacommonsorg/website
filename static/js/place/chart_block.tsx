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
import { chartTypeEnum, ChartBlockData, CachedChoroplethData } from "./types";
import { randDomId } from "../shared/util";
import { Chart } from "./chart";
import { displayNameForPlaceType } from "./util";
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
   * All place names
   */
  names: { [key: string]: string };
  /**
   * Data for this chart block
   */
  data: ChartBlockData;
  /**
   * If the primary place is in USA.
   */
  isUsaPlace: boolean;
  /**
   * Geojson data for places one level down of current dcid.
   */
  geoJsonData: unknown;
  /**
   * Values of statvar/denominator combinations for places one level down of current dcid
   */
  choroplethData: CachedChoroplethData;
  childPlaceType: string;
  parentPlaceDcid: string;
}

class ChartBlock extends React.Component<ChartBlockPropType, unknown> {
  constructor(props: ChartBlockPropType) {
    super(props);
  }

  render(): JSX.Element {
    const chartElements: JSX.Element[] = [];
    // Plot trend data in overview and topic page.
    if (!_.isEmpty(this.props.data.trend)) {
      const id = randDomId();
      const rankingParam = new URLSearchParams(`h=${this.props.dcid}`);
      this.props.data.denominator && rankingParam.set("pc", "1");
      this.props.data.scaling && rankingParam.set("scaling", "100");
      this.props.data.unit && rankingParam.set("unit", this.props.data.unit);
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
          names={this.props.names}
          scaling={this.props.data.scaling}
          statsVars={this.props.data.statsVars}
          rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${
            this.props.parentPlaceDcid
          }?${rankingParam.toString()}`}
        ></Chart>
      );
    }

    // Only add comparison chart for US places.
    if (this.props.isUsaPlace) {
      // Prepare parameters for related charts.
      let unit = this.props.data.unit;
      let scaling = this.props.data.scaling;
      const relatedChart = this.props.data.relatedChart;
      if (relatedChart && relatedChart.scale) {
        unit = relatedChart.unit;
        scaling = relatedChart.scaling ? relatedChart.scaling : 1;
      }
      const chartType =
        this.props.data.statsVars.length == 1
          ? chartTypeEnum.STACK_BAR
          : chartTypeEnum.GROUP_BAR;
      const displayPlaceType = displayNameForPlaceType(
        this.props.placeType,
        true /* isPlural */
      ).toLocaleLowerCase();

      const relatedChartTitle =
        this.props.data.relatedChart && this.props.data.relatedChart.title
          ? this.props.data.relatedChart.title
          : this.props.data.title;

      const sharedProps = {
        dcid: this.props.dcid,
        placeType: this.props.placeType,
        chartType: chartType,
        unit: unit,
        names: this.props.names,
        scaling: scaling,
        statsVars: this.props.data.statsVars,
      };
      const rankingParam = new URLSearchParams(`h=${this.props.dcid}`);
      if (
        this.props.data.denominator ||
        (!!this.props.data.relatedChart && this.props.data.relatedChart.scale)
      ) {
        rankingParam.set("pc", "1");
      }
      scaling && rankingParam.set("scaling", String(scaling));
      unit && rankingParam.set("unit", unit);
      const rankingArg = `?${rankingParam.toString()}`;

      if (this.props.isOverview) {
        // Show child place(state) chart for USA page, otherwise show nearby
        // places.
        const id = randDomId();
        if (this.props.dcid === "country/USA") {
          if (!_.isEmpty(this.props.data.child)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                snapshot={this.props.data.child}
                title={`${relatedChartTitle}: States within ${this.props.placeName}`}
                rankingTemplateUrl={`/ranking/_sv_/State/country/USA${rankingArg}`}
                {...sharedProps}
              ></Chart>
            );
          }
        } else {
          if (!_.isEmpty(this.props.data.nearby)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                snapshot={this.props.data.nearby}
                title={`${relatedChartTitle}: ${displayPlaceType} near ${this.props.placeName}`}
                rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.props.parentPlaceDcid}${rankingArg}`}
                {...sharedProps}
              ></Chart>
            );
          } else if (!_.isEmpty(this.props.data.child)) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                snapshot={this.props.data.child}
                title={`${relatedChartTitle}: Places within ${this.props.placeName}`}
                rankingTemplateUrl={`/ranking/_sv_/${this.props.childPlaceType}/${this.props.dcid}${rankingArg}`}
                {...sharedProps}
              ></Chart>
            );
          }
        }
      } else {
        // Topic page
        if (!_.isEmpty(this.props.data.nearby)) {
          const id = randDomId();
          chartElements.push(
            <Chart
              key={id}
              id={id}
              snapshot={this.props.data.nearby}
              title={`${relatedChartTitle}: ${displayPlaceType} near ${this.props.placeName}`}
              rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.props.parentPlaceDcid}${rankingArg}`}
              {...sharedProps}
            ></Chart>
          );
        }
        if (!_.isEmpty(this.props.data.similar)) {
          const id = randDomId();
          chartElements.push(
            <Chart
              key={id}
              id={id}
              snapshot={this.props.data.similar}
              title={`${relatedChartTitle}: other ${displayPlaceType}`}
              rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/country/USA${rankingArg}`}
              {...sharedProps}
            ></Chart>
          );
        }
        if (this.props.placeType !== "City") {
          // TODO(shifucun): Get the child place type in mixer.
          if (!_.isEmpty(this.props.data.child)) {
            const id = randDomId();
            chartElements.push(
              <Chart
                key={id}
                id={id}
                snapshot={this.props.data.child}
                title={`${relatedChartTitle}: Places within ${this.props.placeName}`}
                rankingTemplateUrl={`/ranking/_sv_/${this.props.childPlaceType}/${this.props.dcid}${rankingArg}`}
                {...sharedProps}
              ></Chart>
            );
          }
        }
        if (this.props.placeType !== "State") {
          if (!_.isEmpty(this.props.data.parent)) {
            const id = randDomId();
            const snapshotData = this.props.data.parent;
            // Show two level of population for parent place charts.
            if (
              sharedProps.statsVars.length === 1 &&
              sharedProps.statsVars[0] == "Count_Person"
            ) {
              snapshotData.data = snapshotData.data.slice(0, 2);
            }
            chartElements.push(
              <Chart
                key={id}
                id={id}
                snapshot={snapshotData}
                title={`${relatedChartTitle}: places that contain ${this.props.placeName}`}
                rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/country/USA${rankingArg}`}
                {...sharedProps}
              ></Chart>
            );
          }
        }
        if (
          !!this.props.data.isChoropleth &&
          (this.props.placeType === "Country" ||
            this.props.placeType === "State")
        ) {
          const id = randDomId();
          const sv = !_.isEmpty(this.props.data.statsVars)
            ? this.props.data.statsVars[0]
            : "";
          const svChoroplethData = this.props.choroplethData[sv];
          if (!_.isEmpty(this.props.geoJsonData) && !!svChoroplethData) {
            chartElements.push(
              <Chart
                key={id}
                id={id}
                dcid={this.props.dcid}
                placeType={this.props.placeType}
                chartType={chartTypeEnum.CHOROPLETH}
                title={`${relatedChartTitle}: places within ${this.props.placeName}`}
                unit={unit}
                names={this.props.names}
                scaling={scaling}
                geoJsonData={this.props.geoJsonData}
                choroplethData={svChoroplethData}
                statsVars={this.props.data.statsVars}
                rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.props.dcid}${rankingArg}`}
              ></Chart>
            );
          }
        }
      }
    }
    return <>{chartElements}</>;
  }
}

export { ChartBlock };
