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
import { RawIntlProvider } from "react-intl";

import {
  CachedChoroplethData,
  CachedRankingChartData,
  ChartBlockData,
  GeoJsonData,
  PageChart,
} from "../chart/types";
import { intl } from "../i18n/i18n";
import { randDomId } from "../shared/util";
import { ChartBlock } from "./chart_block";
import { ChartHeader } from "./chart_header";
import { Overview } from "./overview";

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
  childPlacesType: string;
  /**
   * DCIDs of parent places
   */
  parentPlaces: string[];
  /**
   * Translated strings for categories.
   */
  categoryStrings: { string: string };
  /**
   * Promise for ranking chart data.
   */
  rankingChartData: Promise<CachedRankingChartData>;
  /**
   * The locale of the page.
   */
  locale: string;
}

class MainPane extends React.Component<MainPanePropType> {
  constructor(props: MainPanePropType) {
    super(props);
  }

  showOverview(): boolean {
    // Only Show map and ranking for US places.
    return (
      this.props.isUsaPlace &&
      this.props.placeType !== "Country" &&
      this.props.category === "Overview"
    );
  }

  renderChartBlock(data: ChartBlockData, category: string): JSX.Element {
    return (
      <ChartBlock
        key={data.title + randDomId()}
        dcid={this.props.dcid}
        placeName={this.props.placeName}
        placeType={this.props.placeType}
        isUsaPlace={this.props.isUsaPlace}
        names={this.props.names}
        data={data}
        locale={this.props.locale}
        geoJsonData={this.props.geoJsonData}
        choroplethData={this.props.choroplethData}
        childPlaceType={this.props.childPlacesType}
        parentPlaces={this.props.parentPlaces}
        category={category}
        rankingChartData={this.props.rankingChartData}
      />
    );
  }

  render(): JSX.Element {
    const categoryData = this.props.pageChart[this.props.category];
    const isOverview = this.props.category === "Overview";
    const topics = Object.keys(categoryData);
    return (
      <RawIntlProvider value={intl}>
        {this.showOverview() && (
          <Overview
            dcid={this.props.dcid}
            showRanking={true}
            locale={this.props.locale}
          />
        )}
        {topics.map((topic: string, index: number) => {
          if (isOverview) {
            return (
              <section className="block col-12" key={topic + index}>
                <ChartHeader
                  text={topic}
                  place={this.props.dcid}
                  isOverview={true}
                  categoryStrings={this.props.categoryStrings}
                />
                <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1">
                  {categoryData[topic].map((data: ChartBlockData) => {
                    return this.renderChartBlock(data, this.props.category);
                  })}
                </div>
              </section>
            );
          } else {
            // For non overview page, each chart config makes a chart block,
            // The topic is only used for grouping, which is not displayed on
            // UI.
            return [
              topic && (
                <section
                  className="block topic-header col-12"
                  key={topic + index}
                >
                  <h2 id={topic} className="topic">
                    {topic}
                  </h2>
                </section>
              ),
              categoryData[topic].map((data: ChartBlockData, index) => {
                return (
                  <section className="block col-12" key={index + data.title}>
                    <ChartHeader
                      text={data.title}
                      place={this.props.dcid}
                      isOverview={false}
                      categoryStrings={this.props.categoryStrings}
                    />
                    <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1">
                      {this.renderChartBlock(data, this.props.category)}
                    </div>
                  </section>
                );
              }),
            ];
          }
        })}
      </RawIntlProvider>
    );
  }
}

export { MainPane };
