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
import {
  chartTypeEnum,
  ChartBlockData,
  CachedChoroplethData,
  GeoJsonData,
} from "./types";
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
   * Promise for Geojson data for choropleth for current dcid.
   */
  geoJsonData: Promise<GeoJsonData>;
  /**
   * Promise for Values of statvar/denominator combinations for choropleth for current dcid
   */
  choroplethData: Promise<CachedChoroplethData>;
  /**
   * Place type for the list of child places used for contained charts
   */
  childPlaceType: string;
  /**
   * DCIDs of parent places
   */
  parentPlaces: string[];
  /**
   * The topic of the page the chart block is in
   */
  topic: string;
}

class ChartBlock extends React.Component<ChartBlockPropType, unknown> {
  parentPlaceDcid: string;
  parentCountry: string;
  constructor(props: ChartBlockPropType) {
    super(props);

    this.parentPlaceDcid = this.props.parentPlaces.length
      ? this.props.parentPlaces[0]
      : "";
    this.parentCountry = "";
    for (const place of this.props.parentPlaces) {
      if (place.startsWith("country/")) {
        this.parentCountry = place;
        break;
      }
    }
  }

  render(): JSX.Element {
    const chartElements: JSX.Element[] = [];
    // Plot trend data in overview and topic page.
    if (!_.isEmpty(this.props.data.trend)) {
      const id = randDomId();
      const rankingParam = new URLSearchParams(`h=${this.props.dcid}`);
      this.props.data.denominator && rankingParam.set("pc", "1");
      this.props.data.scaling &&
        rankingParam.set("scaling", String(this.props.data.scaling));
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
            this.parentPlaceDcid
          }?${rankingParam.toString()}`}
          topic={this.props.topic}
        ></Chart>
      );
    }

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
      topic: this.props.topic,
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
      // Show one related place for overview page, the preference is
      // nearby -> child -> similar -> parent
      let gotChart = false;
      if (!_.isEmpty(this.props.data.nearby)) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            snapshot={this.props.data.nearby}
            title={`${relatedChartTitle}: ${displayPlaceType} near ${this.props.placeName}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.parentPlaceDcid}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
        gotChart = true;
      }
      if (!gotChart && !_.isEmpty(this.props.data.child)) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            snapshot={this.props.data.child}
            title={`${relatedChartTitle}: places within ${this.props.placeName}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.props.childPlaceType}/${this.props.dcid}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
        gotChart = true;
      }
      if (!gotChart && !_.isEmpty(this.props.data.similar)) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            snapshot={this.props.data.similar}
            title={`${relatedChartTitle}: other ${displayPlaceType}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.parentCountry}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
        gotChart = true;
      }
      if (!gotChart && !_.isEmpty(this.props.data.parent)) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            snapshot={this.props.data.parent}
            title={`${relatedChartTitle}: places that contain ${this.props.placeName}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.parentCountry}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
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
            rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.parentPlaceDcid}${rankingArg}`}
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
            rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.parentCountry}${rankingArg}`}
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
              title={`${relatedChartTitle}: places within ${this.props.placeName}`}
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
              rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.parentCountry}${rankingArg}`}
              {...sharedProps}
            ></Chart>
          );
        }
      }
      if (
        !!this.props.data.isChoropleth &&
        this.props.isUsaPlace &&
        // d3 can't draw choropleth for Puerto Rico (geoId/72)
        this.props.dcid !== "geoId/72"
      ) {
        const id = randDomId();
        const chartTitle =
          this.props.placeType === "County"
            ? `${relatedChartTitle}: ${displayPlaceType} near ${this.props.placeName}`
            : `${relatedChartTitle}: places within ${this.props.placeName}`;
        chartElements.push(
          <Chart
            key={id}
            id={id}
            dcid={this.props.dcid}
            placeType={this.props.placeType}
            chartType={chartTypeEnum.CHOROPLETH}
            title={chartTitle}
            unit={unit}
            names={this.props.names}
            scaling={scaling}
            geoJsonData={this.props.geoJsonData}
            choroplethData={this.props.choroplethData}
            statsVars={this.props.data.statsVars}
            rankingTemplateUrl={`/ranking/_sv_/${this.props.placeType}/${this.props.dcid}${rankingArg}`}
            topic={this.props.topic}
          ></Chart>
        );
      }
    }
    return <>{chartElements}</>;
  }
}

export { ChartBlock };
