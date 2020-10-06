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
import { ChartBlock } from "./chart_block";
import { Overview } from "./overview";
import { PageChart, ChartBlockData, CachedChoroplethData } from "./types";

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
   * The category of the current page.
   */
  category: string;
  /**
   * The config and stat data.
   */
  pageChart: PageChart;

  /**
   * If the primary place is in USA.
   */
  isUsaPlace: boolean;
  /**
   * All place names
   */
  names: { [key: string]: string };
  /**
   * Geojson data for places one level down of current dcid.
   * TODO(chejennifer): replace unknown type with type for geojson
   */
  geoJsonData: unknown;
  /**
   * Values of statvar/denominator combinations for places one level down of current dcid
   */
  choroplethData: CachedChoroplethData;
  /**
   * Place type for the list of child places used for contained charts
   */
  childPlacesType: string;
  /**
   * DCID of the immediate parent place
   */
  parentPlaceDcid: string;
}

class MainPane extends React.Component<MainPanePropType, unknown> {
  constructor(props: MainPanePropType) {
    super(props);
  }

  render(): JSX.Element {
    const topicData = this.props.pageChart[this.props.category];
    const category = this.props.category;
    const isOverview = category === "Overview";
    return (
      <>
        {this.props.isUsaPlace &&
          this.props.placeType != "Country" &&
          isOverview && (
            // Only Show map and ranking for US places.
            <Overview dcid={this.props.dcid} />
          )}
        {Object.keys(topicData).map((topic: string) => {
          let subtopicHeader: JSX.Element;
          if (isOverview && Object.keys(this.props.pageChart).length > 1) {
            subtopicHeader = (
              <h3 id={topic}>
                <a href={`/place?dcid=${this.props.dcid}&topic=${topic}`}>
                  {topic}
                </a>
                <span className="more">
                  <a href={`/place?dcid=${this.props.dcid}&topic=${topic}`}>
                    More charts ›
                  </a>
                </span>
              </h3>
            );
          } else {
            subtopicHeader = <h3 id={topic}>{topic}</h3>;
          }
          return (
            <section className="subtopic col-12" key={topic}>
              {subtopicHeader}
              <div className="row row-cols-md-2 row-cols-1">
                {topicData[topic].map((data: ChartBlockData) => {
                  return (
                    <ChartBlock
                      key={data.title}
                      isOverview={isOverview}
                      dcid={this.props.dcid}
                      placeName={this.props.placeName}
                      placeType={this.props.placeType}
                      isUsaPlace={this.props.isUsaPlace}
                      names={this.props.names}
                      data={data}
                      geoJsonData={this.props.geoJsonData}
                      choroplethData={this.props.choroplethData}
                      childPlaceType={this.props.childPlacesType}
                      parentPlaceDcid={this.props.parentPlaceDcid}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </>
    );
  }
}

export { MainPane };
