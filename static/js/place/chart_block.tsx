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
} from "../chart/types";
import { randDomId } from "../shared/util";
import { Chart } from "./chart";
import { displayNameForPlaceType } from "./util";
import _ from "lodash";
import { intl, translateVariableString } from "../i18n/i18n";
import { defineMessages } from "react-intl";

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

class ChartBlock extends React.Component<ChartBlockPropType> {
  parentPlaceDcid: string;
  parentCountry: string;
  displayPlaceName: string;
  rankingPlaceType: string;
  displayDataTitle: string;
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
    const isEarth = this.props.dcid == "Earth";
    // We will localize Earth to a translation of "the World".
    // However, we will not localize other Place names, as we will later
    // pull the localized names from the KG.
    this.displayPlaceName = isEarth
      ? intl.formatMessage({
          // Matching ID as above
          id: "the_world",
          // Default Message in English. Note that this will still log error.
          // TODO(tjann): See if we can surpress error logs.
          defaultMessage: "the World",
          description:
            "Change appearances of the name Earth to the World. E.g. this is the Labor force participation rate in the World, rather than this is the Labor force participation rate in Earth.",
        })
      : this.props.placeName;
    this.rankingPlaceType = isEarth ? "Country" : this.props.placeType;
    this.displayDataTitle = translateVariableString(this.props.data.title);
    // TODO(tjann): Localize unit after we have a high level approach
    // TODO(datcom): Localize place names via KG.
  }

  render(): JSX.Element {
    const chartElements: JSX.Element[] = [];
    // Plot trend data in overview and topic page.
    // Do not directly localize param. Localize when used as display string.

    // Declare const of reused messages here.
    const chartClauseMsgs = defineMessages({
      placeTypeNearPlace: {
        id: "chart_clause:placetype_near_place",
        defaultMessage: "{placeType} near {place}",
        description:
          "Preposition for somewhere closeby. Used for choropleth map chart titles like Unemployment rate: counties near Travis County.",
      },
      placesWithinPlace: {
        id: "chart_clause:places_within_place",
        defaultMessage: "places within {place}",
        description:
          "Clause for places within some other place. Used for choropleth map chart titles like Unemployment rate: places within California.",
      },
      otherPlaceTypes: {
        id: "chart_clause:other_placeType",
        defaultMessage: "other {placeType}",
        description:
          "Used to describe other places. Like Educational Attainment in other countries.",
      },
      placesThatContainPlace: {
        id: "chart_clause:places_that_contain_place",
        defaultMessage: "places that contain {place}",
        description:
          "Clause for places that contain some place. E.g. for Educational Attainment for places that contain Fremont (Alameda County, California, USA all contain Fremont).",
      },
    });

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
          chartType={chartTypeEnum.LINE}
          trend={this.props.data.trend}
          title={intl.formatMessage(
            {
              id: "chart_clause:variable_in_place",
              defaultMessage: "{variable} in {place}",
              description:
                "Used for chart titles like Unemployment rate in Texas or Poverty rate in California.",
            },
            { variable: this.displayDataTitle, place: this.displayPlaceName }
          )}
          unit={this.props.data.unit}
          names={this.props.names}
          scaling={this.props.data.scaling}
          statsVars={this.props.data.statsVars}
          rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${
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
      relatedChart && relatedChart.title
        ? translateVariableString(relatedChart.title)
        : this.displayDataTitle;

    const sharedProps = {
      dcid: this.props.dcid,
      unit: unit,
      names: this.props.names,
      scaling: scaling,
      statsVars: this.props.data.statsVars,
      topic: this.props.topic,
    };
    const barChartSharedProps = {
      chartType: chartType,
      ...sharedProps,
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
    const choroplethTitle =
      this.props.placeType === "County"
        ? `${relatedChartTitle}: ${intl.formatMessage(
            chartClauseMsgs.placeTypeNearPlace,
            { placeType: displayPlaceType, place: this.displayPlaceName }
          )}`
        : `${relatedChartTitle}: ${intl.formatMessage(
            chartClauseMsgs.placesWithinPlace,
            { place: this.displayDataTitle }
          )}`;

    if (this.props.isOverview) {
      // Show one related place for overview page, the preference is
      // choropleth -> nearby -> child -> similar -> parent
      let gotChart = false;
      if (
        !!this.props.data.isChoropleth &&
        this.props.isUsaPlace &&
        (this.props.placeType === "Country" ||
          this.props.placeType === "State" ||
          this.props.placeType === "County")
      ) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            chartType={chartTypeEnum.CHOROPLETH}
            title={choroplethTitle}
            geoJsonData={this.props.geoJsonData}
            choroplethData={this.props.choroplethData}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.props.dcid}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
        gotChart = true;
      }
      if (!gotChart && !_.isEmpty(this.props.data.nearby)) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            snapshot={this.props.data.nearby}
            title={`${relatedChartTitle}: ${intl.formatMessage(
              chartClauseMsgs.placeTypeNearPlace,
              { placeType: displayPlaceType, place: this.displayPlaceName }
            )}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentPlaceDcid}${rankingArg}`}
            {...barChartSharedProps}
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
            title={`${relatedChartTitle}: ${intl.formatMessage(
              chartClauseMsgs.placesWithinPlace,
              { place: this.displayDataTitle }
            )}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.props.childPlaceType}/${this.props.dcid}${rankingArg}`}
            {...barChartSharedProps}
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
            title={`${relatedChartTitle}: ${intl.formatMessage(
              chartClauseMsgs.otherPlaceTypes,
              { placeType: displayPlaceType }
            )}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentCountry}${rankingArg}`}
            {...barChartSharedProps}
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
            title={`${relatedChartTitle}: ${intl.formatMessage(
              chartClauseMsgs.placesThatContainPlace,
              { place: this.displayPlaceName }
            )}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentCountry}${rankingArg}`}
            {...barChartSharedProps}
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
            title={`${relatedChartTitle}: ${intl.formatMessage(
              chartClauseMsgs.placeTypeNearPlace,
              { placeType: displayPlaceType, place: this.displayPlaceName }
            )}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentPlaceDcid}${rankingArg}`}
            {...barChartSharedProps}
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
            title={`${relatedChartTitle}: ${intl.formatMessage(
              chartClauseMsgs.otherPlaceTypes,
              { placeType: displayPlaceType }
            )}`}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentCountry}${rankingArg}`}
            {...barChartSharedProps}
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
              title={`${relatedChartTitle}: ${intl.formatMessage(
                chartClauseMsgs.placesWithinPlace,
                { place: this.displayDataTitle }
              )}`}
              rankingTemplateUrl={`/ranking/_sv_/${this.props.childPlaceType}/${this.props.dcid}${rankingArg}`}
              {...barChartSharedProps}
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
              title={`${relatedChartTitle}: ${intl.formatMessage(
                chartClauseMsgs.placesThatContainPlace,
                { place: this.displayPlaceName }
              )}`}
              rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentCountry}${rankingArg}`}
              {...barChartSharedProps}
            ></Chart>
          );
        }
      }
      if (!!this.props.data.isChoropleth && this.props.isUsaPlace) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            chartType={chartTypeEnum.CHOROPLETH}
            title={choroplethTitle}
            geoJsonData={this.props.geoJsonData}
            choroplethData={this.props.choroplethData}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.props.dcid}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
      }
    }
    return <>{chartElements}</>;
  }
}

export { ChartBlock };
