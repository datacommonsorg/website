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
import { ChartCategory } from "./place_types";

interface MenuPropsType {
  dcid: string;
  topic: string;
  chartConfig: ChartCategory[];
}

class Menu extends React.Component<MenuPropsType, unknown> {
  render(): JSX.Element {
    const dcid = this.props.dcid;
    const topic = this.props.topic;
    return (
      <ul id="nav-topics" className="nav flex-column accordion">
        <li className="nav-item">
          <a
            href={`/place?dcid=${dcid}`}
            className={`nav-link ${!topic ? "active" : ""}`}
          >
            Overview
          </a>
        </li>
        {this.props.chartConfig.map((item: ChartCategory) => {
          return (
            <React.Fragment key={item.label}>
              {item.children.length > 0 && (
                <li className="nav-item">
                  <a
                    href={`/place?dcid=${dcid}&topic=${item.label}`}
                    className={`nav-link ${
                      topic === item.label ? "active" : ""
                    }`}
                  >
                    {item.label}
                  </a>
                  <ul
                    className={
                      "nav flex-column ml-3 " +
                      (item.label !== topic ? "collapse" : "")
                    }
                    data-parent="#nav-topics"
                  >
                    <div className="d-block">
                      {item.children.map((child, index) => {
                        return (
                          <li className="nav-item" key={index}>
                            <a
                              href={`/place?dcid=${dcid}&topic=${item.label}#${child.label}`}
                              className="nav-link"
                            >
                              {child.label}
                            </a>
                          </li>
                        );
                      })}
                    </div>
                  </ul>
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ul>
    );
  }
}

export { Menu };
