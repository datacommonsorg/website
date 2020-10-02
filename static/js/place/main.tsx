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
import { CategoryData, ChartBlockData } from "./types";

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
   * The config and stat data.
   */
  configData: CategoryData[];

  /**
   * If the primary place is in USA.
   */
  isUsaPlace: boolean;
  /**
   * All place names
   */
  names: { [key: string]: string };
}

class MainPane extends React.Component<MainPanePropType, unknown> {
  constructor(props: MainPanePropType) {
    super(props);
  }

  render(): JSX.Element {
    let config: { label: string; charts: ChartBlockData[] }[] = [];
    const isOverview = !this.props.topic;
    if (isOverview) {
      config = this.props.configData;
    } else {
      for (const group of this.props.configData) {
        if (group.label === this.props.topic) {
          config = group.children;
          break;
        }
      }
    }
    return (
      <>
        {this.props.isUsaPlace && this.props.placeType != "Country" && (
          // Only Show map and ranking for US places.
          <Overview topic={this.props.topic} dcid={this.props.dcid} />
        )}
        {config.map((item, index) => {
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
                {item.charts.map((data: ChartBlockData, index: number) => {
                  return (
                    <ChartBlock
                      key={index}
                      isOverview={isOverview}
                      dcid={this.props.dcid}
                      placeName={this.props.placeName}
                      placeType={this.props.placeType}
                      isUsaPlace={this.props.isUsaPlace}
                      names={this.props.names}
                      data={data}
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
