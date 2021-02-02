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
import { PageChart } from "../chart/types";
import { intl, LocalizedLink } from "../i18n/i18n";

interface MenuCategoryPropsType {
  dcid: string;
  selectCategory: string;
  category: string;
  topics: string[];
  categoryDisplayStr: string;
}

class MenuCategory extends React.Component<MenuCategoryPropsType> {
  render(): JSX.Element {
    const dcid = this.props.dcid;
    const selectCategory = this.props.selectCategory;
    const category = this.props.category;
    const topics = this.props.topics;
    const hrefString =
      category === "Overview"
        ? `/place/${dcid}`
        : `/place/${dcid}?topic=${category}`;

    return (
      <li className="nav-item">
        <LocalizedLink
          href={hrefString}
          className={`nav-link ${selectCategory === category ? "active" : ""}`}
          text={this.props.categoryDisplayStr}
        />
        <ul
          className={
            "nav flex-column " + (category !== selectCategory ? "collapse" : "")
          }
          data-parent="#nav-topics"
        >
          <div className="d-block">
            {topics.map((topic: string) => {
              return (
                <li className="nav-item" key={topic}>
                  <LocalizedLink
                    href={`${hrefString}#${topic}`}
                    className="nav-link"
                    text={topic}
                  />
                </li>
              );
            })}
          </div>
        </ul>
      </li>
    );
  }
}

interface MenuPropsType {
  categories: { string: string };
  dcid: string;
  topic: string;
  pageChart: PageChart;
}

class Menu extends React.Component<MenuPropsType> {
  render(): JSX.Element {
    const dcid = this.props.dcid;
    const topic = this.props.topic;
    const categories = Object.keys(this.props.pageChart);
    const showOverviewSubmenu = categories.length === 1;
    return (
      <ul id="nav-topics" className="nav flex-column accordion">
        {showOverviewSubmenu ? null : (
          <li className="nav-item">
            <LocalizedLink
              href={`/place/${dcid}`}
              className={`nav-link ${!topic ? "active" : ""}`}
              text={intl.formatMessage({
                id: "header-overview",
                defaultMessage: "Overview",
                description:
                  "Text for header or subheader of Overview charts on place pages.",
              })}
            />
          </li>
        )}
        {categories.map((category: string) => {
          let topics = Object.keys(this.props.pageChart[category]);
          if (category === "Overview") {
            topics = topics.map((t) => this.props.categories[t]);
          }
          const categoryDisplayStr = this.props.categories[category];
          if (showOverviewSubmenu || category !== "Overview") {
            return (
              <MenuCategory
                key={category}
                dcid={dcid}
                selectCategory={topic}
                category={category}
                topics={topics}
                categoryDisplayStr={categoryDisplayStr}
              />
            );
          }
        })}
      </ul>
    );
  }
}

export { Menu };
