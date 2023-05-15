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

import _ from "lodash";
import React from "react";
import { defineMessages } from "react-intl";

import { ChartBlockData, chartTypeEnum } from "../chart/types";
import { intl, localizeSearchParams } from "../i18n/i18n";
import { EARTH_NAMED_TYPED_PLACE } from "../shared/constants";
import { randDomId } from "../shared/util";
import { Chart } from "./chart";
import { shouldMakeChoroplethCalls } from "./fetch";
import {
  displayNameForPlaceType,
  USA_PLACE_TYPES_WITH_CHOROPLETH,
} from "./util";

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
  category: string;
  /**
   * The locale of the page
   */
  locale: string;
}

export class ChartBlock extends React.Component<ChartBlockPropType> {
  parentPlaceDcid: string;
  parentCountry: string;
  displayPlaceName: string;
  rankingPlaceType: string;
  displayDataTitle: string;
  constructor(props: ChartBlockPropType) {
    super(props);

    this.parentCountry = "";
    for (const place of this.props.parentPlaces) {
      if (place.startsWith("country/")) {
        this.parentCountry = place;
        break;
      }
    }
    const isEarth = this.props.dcid === EARTH_NAMED_TYPED_PLACE.dcid;
    // We will localize Earth to a translation of "the World".
    // However, we will not localize other Place names, as we will later
    // pull the localized names from the KG.
    this.displayPlaceName = isEarth
      ? intl.formatMessage({
          id: "the_world",
          defaultMessage: "the World",
          description:
            "Change appearances of the name Earth to the World. E.g. this is the Labor force participation rate in the World, rather than this is the Labor force participation rate in Earth.",
        })
      : this.props.placeName;
    this.parentPlaceDcid = this.props.parentPlaces.length
      ? this.props.parentPlaces[0]
      : isEarth
      ? "Earth"
      : "";
    this.rankingPlaceType = isEarth ? "Country" : this.props.placeType;
    this.displayDataTitle = this.props.data.title;
  }

  render(): JSX.Element {
    const chartElements: JSX.Element[] = [];
    // Plot trend data in overview and topic page.
    // Do not directly localize param. Localize when used as display string.

    // Declare const of reused messages here.
    const chartTitleMsgs = defineMessages({
      placeTypeNearPlace: {
        id: "chart_clause-placetype_near_place",
        defaultMessage: "{chartTitle}: {placeType} near {placeName}",
        description:
          'Preposition for somewhere close by. Used for choropleth map chart titles like "Unemployment rate: {counties} near {Travis County}" or "Annual rainfall: {towns} near {Taos}"',
      },
      placesWithinPlace: {
        id: "chart_clause-places_within_place",
        defaultMessage: "{chartTitle}: places within {placeName}",
        description:
          'Clause for places within some other place. Used for choropleth map chart titles like "Unemployment rate: places within {Tamil Nadu}."',
      },
      otherPlaceTypes: {
        id: "chart_clause-other_placeType",
        defaultMessage: "{chartTitle}: other {placeType}",
        description:
          'Used to describe other places. Like "Educational Attainment in other {countries}".',
      },
      placesThatContainPlace: {
        id: "chart_clause-places_that_contain_place",
        defaultMessage: "{chartTitle}: places that contain {placeName}",
        description:
          'Clause for places that contain some place. E.g. for "Educational Attainment for places that contain {Fremont}" (which would be Alameda County, California, USA, North America).',
      },
    });

    if (!_.isEmpty(this.props.data.trend)) {
      const id = randDomId();
      let rankingParam = new URLSearchParams(`h=${this.props.dcid}`);
      this.props.data.denominator && rankingParam.set("pc", "1");
      this.props.data.scaling &&
        rankingParam.set("scaling", String(this.props.data.scaling));
      this.props.data.unit && rankingParam.set("unit", this.props.data.unit);
      rankingParam = localizeSearchParams(rankingParam);
      chartElements.push(
        <Chart
          key={id}
          id={id}
          dcid={this.props.dcid}
          chartType={chartTypeEnum.LINE}
          trend={this.props.data.trend}
          title={intl.formatMessage(
            {
              id: "chart_clause-variable_in_place",
              defaultMessage: "{variable} in {placeName}",
              description:
                'Used for chart titles like "{Unemployment rate} in {USA}" or "{Poverty rate} in {California}".',
            },
            {
              variable: this.displayDataTitle,
              placeName: this.displayPlaceName,
            }
          )}
          unit={this.props.data.unit}
          names={this.props.names}
          scaling={this.props.data.scaling}
          statsVars={this.props.data.statsVars}
          rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${
            this.parentPlaceDcid
          }?${rankingParam.toString()}`}
          category={this.props.category}
          isUsaPlace={this.props.isUsaPlace}
        ></Chart>
      );
    }
    const relatedChart = this.props.data.relatedChart;
    if (!relatedChart) {
      return <>{chartElements}</>;
    }

    // Prepare parameters for related charts.
    let unit = this.props.data.unit;
    let scaling = this.props.data.scaling;
    const isEarth = this.props.dcid === EARTH_NAMED_TYPED_PLACE.dcid;
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
        ? relatedChart.title
        : this.displayDataTitle;

    const sharedProps = {
      // TODO: remove all the fields that already belong to spec.
      spec: this.props.data,
      dcid: this.props.dcid,
      unit: unit,
      names: this.props.names,
      scaling: scaling,
      statsVars: this.props.data.statsVars,
      category: this.props.category,
      isUsaPlace: this.props.isUsaPlace,
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
    const rankingArg = `?${localizeSearchParams(rankingParam).toString()}`;
    const choroplethTitle =
      this.props.placeType === "County"
        ? intl.formatMessage(chartTitleMsgs.placeTypeNearPlace, {
            chartTitle: relatedChartTitle,
            placeType: displayPlaceType,
            placeName: this.displayPlaceName,
          })
        : intl.formatMessage(chartTitleMsgs.placesWithinPlace, {
            chartTitle: relatedChartTitle,
            placeName: this.displayPlaceName,
          });

    if (this.props.category === "Overview") {
      // Show one related place for overview page, the preference is
      // choropleth -> nearby -> child -> similar -> parent
      let gotChart = false;
      if (
        !!this.props.data.isChoropleth &&
        (isEarth ||
          (this.props.isUsaPlace &&
            USA_PLACE_TYPES_WITH_CHOROPLETH.has(this.props.placeType)))
      ) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            chartType={chartTypeEnum.CHOROPLETH}
            title={choroplethTitle}
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
            title={intl.formatMessage(chartTitleMsgs.placeTypeNearPlace, {
              chartTitle: relatedChartTitle,
              placeType: displayPlaceType,
              placeName: this.displayPlaceName,
            })}
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
            title={intl.formatMessage(chartTitleMsgs.placesWithinPlace, {
              chartTitle: relatedChartTitle,
              placeName: this.displayPlaceName,
            })}
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
            title={intl.formatMessage(chartTitleMsgs.otherPlaceTypes, {
              chartTitle: relatedChartTitle,
              placeType: displayPlaceType,
            })}
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
            title={intl.formatMessage(chartTitleMsgs.placesThatContainPlace, {
              chartTitle: relatedChartTitle,
              placeName: this.displayPlaceName,
            })}
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
            title={intl.formatMessage(chartTitleMsgs.placeTypeNearPlace, {
              chartTitle: relatedChartTitle,
              placeType: displayPlaceType,
              placeName: this.displayPlaceName,
            })}
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
            title={intl.formatMessage(chartTitleMsgs.otherPlaceTypes, {
              chartTitle: relatedChartTitle,
              placeType: displayPlaceType,
            })}
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
              title={intl.formatMessage(chartTitleMsgs.placesWithinPlace, {
                chartTitle: relatedChartTitle,
                placeName: this.displayPlaceName,
              })}
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
              title={intl.formatMessage(chartTitleMsgs.placesThatContainPlace, {
                chartTitle: relatedChartTitle,
                placeName: this.displayPlaceName,
              })}
              rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentCountry}${rankingArg}`}
              {...barChartSharedProps}
            ></Chart>
          );
        }
      }
      const drawChoropleth =
        !!this.props.data.isChoropleth &&
        shouldMakeChoroplethCalls(this.props.dcid, this.props.placeType);
      if (drawChoropleth) {
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            chartType={chartTypeEnum.CHOROPLETH}
            title={choroplethTitle}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.props.dcid}${rankingArg}`}
            {...sharedProps}
          ></Chart>
        );
      }
      if (this.props.data.isRankingChart) {
        const parentPlaceName: string = this.parentPlaceDcid
          ? this.props.names[this.parentPlaceDcid].split(",")[0]
          : "";
        const id = randDomId();
        chartElements.push(
          <Chart
            key={id}
            id={id}
            dcid={this.props.dcid}
            chartType={chartTypeEnum.RANKING}
            title={intl.formatMessage(
              {
                defaultMessage: "{variable}: rankings in {placeName}",
                description:
                  "Used for chart titles like '{Unemployment rate}: rankings in {USA}'.",
                id: "chart_clause-rankings_in_place",
              },
              {
                placeName: isEarth ? this.displayPlaceName : parentPlaceName,
                variable: this.displayDataTitle,
              }
            )}
            rankingTemplateUrl={`/ranking/_sv_/${this.rankingPlaceType}/${this.parentPlaceDcid}${rankingArg}`}
            // Ranking chart ignores the related chart config for now.
            unit={this.props.data.unit}
            names={this.props.names}
            scaling={this.props.data.scaling}
            statsVars={this.props.data.statsVars}
            category={this.props.category}
            isUsaPlace={this.props.isUsaPlace}
            rankingPlaceType={this.rankingPlaceType}
            parentPlaceDcid={this.parentPlaceDcid}
          ></Chart>
        );
      }
    }
    return <>{chartElements}</>;
  }
}
