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
import { IntlProvider, FormattedMessage, FormattedNumber } from "react-intl";

import { ChartBlock } from "./chart_block";
import { Overview } from "./overview";
import {
  PageChart,
  ChartBlockData,
  CachedChoroplethData,
  GeoJsonData,
} from "../chart/types";

interface MainPanePropType {
  /**
   * The locale.
   */
  locale: string;
  /**
   * The translation messages.
   */
  translations: any;
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
}

class MainPane extends React.Component<MainPanePropType> {
  constructor(props: MainPanePropType) {
    super(props);
  }

  render(): JSX.Element {
    const topicData = this.props.pageChart[this.props.topic];
    const currentPageTopic = this.props.topic;
    const isOverview = currentPageTopic === "Overview";
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
                <a href={`/place/${this.props.dcid}?topic=${topic}`}>
                  <IntlProvider
                    messages={this.props.translations}
                    locale={this.props.locale}
                    defaultLocale="en"
                  >
                    <FormattedMessage
                      id={topic}
                      defaultMessage={topic}
                      description="A header for a section of the Overview charts page that breaks the page down into Education, Health, and other domains."
                    />
                  </IntlProvider>
                </a>
                <span className="more">
                  <a href={`/place/${this.props.dcid}?topic=${topic}`}>
                    <IntlProvider
                      messages={this.props.translations}
                      locale={this.props.locale}
                      defaultLocale="en"
                    >
                      <FormattedMessage
                        id="more_charts"
                        defaultMessage="More charts ›"
                        description="Link to explore more charts about a particular domain, such as Education or Health."
                      />
                    </IntlProvider>
                  </a>
                </span>
              </h3>
            );
          } else {
            subtopicHeader = (
              <h3 id={topic}>
                <IntlProvider
                  messages={this.props.translations}
                  locale={this.props.locale}
                  defaultLocale="en"
                >
                  <FormattedMessage
                    id={topic}
                    defaultMessage={topic}
                    description="A section of our charts page that describes a subtopic such as Unemployment within a domain, such as Economics."
                  />
                </IntlProvider>
              </h3>
            );
          }
          return (
            <section className="subtopic col-12" key={topic}>
              {subtopicHeader}
              <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1">
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
                      parentPlaces={this.props.parentPlaces}
                      topic={currentPageTopic}
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
