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
import { CachedStatVarDataMap } from "../shared/data_fetcher";
import {
  ConfigType,
  chartTypeEnum,
  childPlacesType,
  parentPlacesType,
  placeRelationEnum,
} from "./types";
import { randDomId } from "../shared/util";
import { Chart } from "./chart";
import {
  displayNameForPlaceType,
  isPlaceInUsa,
  childPlaceTypeWithMostPlaces,
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
   * If the chart block is in overview page.
   */
  isOverview: boolean;
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
   * The child places keyed by place types.
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

class ChartBlock extends React.Component<ChartBlockPropType, unknown> {
  constructor(props: ChartBlockPropType) {
    super(props);
  }

  render(): JSX.Element {
    const configList = this.props.isOverview
      ? this.buildOverviewConfig(this.props.placeType, this.props.config)
      : this.buildTopicConfig(this.props.placeType, this.props.config);
    return (
      <>
        {configList.map((item) => {
          const id = randDomId();
          return (
            <Chart
              key={id}
              id={id}
              config={item}
              dcid={this.props.dcid}
              placeType={this.props.placeType}
              parentPlaces={this.props.parentPlaces}
              childPlaces={this.props.childPlaces}
              similarPlaces={this.props.similarPlaces}
              nearbyPlaces={this.props.nearbyPlaces}
              chartData={this.props.chartData}
            />
          );
        })}
      </>
    );
  }

  private copyAndUpdateConfig(config: ConfigType) {
    const conf = { ...config };
    conf.chartType = chartTypeEnum.GROUP_BAR;
    conf.axis = "PLACE";
    if (conf.relatedChart != null && conf.relatedChart.scale) {
      conf.perCapita = true;
      conf.unit = "%";
      conf.scaling = 100;
    }
    return conf;
  }

  private buildOverviewConfig(
    placeType: string,
    config: ConfigType
  ): ConfigType[] {
    const result = [];
    let conf = { ...config };
    conf.chartType = chartTypeEnum.LINE;
    conf.title = conf.title + " in " + this.props.placeName;
    result.push(conf);
    if (!isPlaceInUsa(this.props.parentPlaces)) {
      // Temporarily drop comparison charts for non-US Places
      return result;
    }

    conf = this.copyAndUpdateConfig(config);
    if (placeType === "Country") {
      // Containing place chart
      const childPlaceType =
        this.props.dcid == "country/USA" ? "states" : "places";
      conf.title = `${conf.title} across ${childPlaceType} within ${this.props.placeName}`;
      conf.placeRelation = placeRelationEnum.CONTAINING;
    } else {
      const displayPlaceType = displayNameForPlaceType(
        placeType,
        true /* isPlural */
      ).toLocaleLowerCase();
      conf.title = `${conf.title} across ${displayPlaceType} near ${this.props.placeName}`;
      conf.placeRelation = placeRelationEnum.NEARBY;
    }
    result.push(conf);
    return result;
  }

  private buildTopicConfig(placeType: string, config: ConfigType) {
    const result: ConfigType[] = [];
    let conf = { ...config };
    conf.chartType = chartTypeEnum.LINE;
    conf.title = conf.title + " in " + this.props.placeName;
    result.push(conf);

    const displayPlaceType = displayNameForPlaceType(
      placeType,
      true /* isPlural */
    ).toLocaleLowerCase();
    if (placeType !== "Country") {
      // Nearby places
      conf = this.copyAndUpdateConfig(config);
      conf.placeRelation = placeRelationEnum.NEARBY;
      conf.title = `${conf.title} across ${displayPlaceType} near ${this.props.placeName}`;
      result.push(conf);
    }
    if (placeType !== "Country") {
      // Similar places
      conf = this.copyAndUpdateConfig(config);
      conf.placeRelation = placeRelationEnum.SIMILAR;
      conf.title = `${conf.title} across other ${displayPlaceType}`;
      result.push(conf);
    }
    if (placeType !== "City") {
      // Children places
      conf = this.copyAndUpdateConfig(config);
      conf.placeRelation = placeRelationEnum.CONTAINING;
      const childPlaceType = isPlaceInUsa(this.props.parentPlaces)
        ? displayNameForPlaceType(
            childPlaceTypeWithMostPlaces(
              this.props.childPlaces
            ).toLocaleLowerCase(),
            true /* isPlural */
          )
        : "places";
      conf.title = `${conf.title} across ${childPlaceType} within ${this.props.placeName}`;
      result.push(conf);
    } else {
      // Parent places.
      conf = this.copyAndUpdateConfig(config);
      conf.placeRelation = placeRelationEnum.CONTAINED;
      conf.title = `${conf.title} across places that contain ${this.props.placeName}`;
      result.push(conf);
    }
    return result;
  }
}

export { ChartBlock };
