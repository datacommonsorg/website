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
import { ChartBlock } from "./chart_block";
import { Overview } from "./overview";
import {
  ChartCategory,
  ConfigType,
  childPlacesType,
  parentPlacesType,
  CachedChoroplethData,
} from "./types";
import { isPlaceInUsa } from "./util";

interface MainPanePropType {
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
   * The topic of the current page.
   */
  topic: string;
  /**
   * An array of parent place objects.
   */
  parentPlaces: parentPlacesType;
  /**
   * An object from child place types to child places dcids.
   */
  childPlaces: childPlacesType;
  /**
   * Similar places dcids.
   */
  similarPlaces: string[];
  /**
   * Nearby places dcids.
   */
  nearbyPlaces: string[];
  /**
   * An object from statsvar dcid to the url tokens used by timeline tool.
   */
  chartConfig: ChartCategory[];
  /**
   * Cached stat var data for filling in charts.
   */
  chartData: CachedStatVarDataMap;
  /**
   * Geojson data for places one level down of current dcid.
   */
  geoJsonData: unknown;
  /**
   * Values of statvar/denominator combinations for places one level down of current dcid 
   */
  choroplethData: CachedChoroplethData;
}

class MainPane extends React.Component<MainPanePropType, unknown> {
  constructor(props: MainPanePropType) {
    super(props);
  }

  render(): JSX.Element {
    let configData = [];
    const isOverview = !this.props.topic;
    if (isOverview) {
      configData = this.props.chartConfig;
    } else {
      for (const group of this.props.chartConfig) {
        if (group.label === this.props.topic) {
          configData = group.children;
          break;
        }
      }
    }
    return (
      <React.Fragment>
        {isPlaceInUsa(this.props.parentPlaces) && (
          // Only Show map and ranking for US places.
          <Overview topic={this.props.topic} dcid={this.props.dcid} />
        )}
        {configData.map((item, index) => {
          let subtopicHeader: JSX.Element;
          if (isOverview) {
            subtopicHeader = (
              <h3 id={item.label}>
                <a href={`/place?dcid=${this.props.dcid}&topic=${item.label}`}>
                  {item.label}
                </a>
                <span className="more">
                  <a
                    href={`/place?dcid=${this.props.dcid}&topic=${item.label}`}
                  >
                    More charts ›
                  </a>
                </span>
              </h3>
            );
          } else {
            subtopicHeader = <h3 id={item.label}>{item.label}</h3>;
          }
          return (
            <section className="subtopic col-12" key={index}>
              {subtopicHeader}
              <div className="row row-cols-md-2 row-cols-1">
                {item.charts.map((config: ConfigType, index) => {
                  return (
                    <ChartBlock
                      key={index}
                      isOverview={isOverview}
                      config={config}
                      dcid={this.props.dcid}
                      placeName={this.props.placeName}
                      placeType={this.props.placeType}
                      parentPlaces={this.props.parentPlaces}
                      childPlaces={this.props.childPlaces}
                      similarPlaces={this.props.similarPlaces}
                      nearbyPlaces={this.props.nearbyPlaces}
                      chartData={this.props.chartData}
                      geoJsonData={this.props.geoJsonData}
                      choroplethData={this.props.choroplethData}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </React.Fragment>
    );
  }
}

export { MainPane };
