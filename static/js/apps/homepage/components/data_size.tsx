/**
 * Copyright 2024 Google LLC
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

/**
 * A component that renders the data size section of the home page.
 */

import React, { ReactElement } from "react";

const DataSize = (): ReactElement => {
  return (
    <section id="data-size">
      <div className="container">
        <div id="data-size-content">
          <article>
            <h4>Data from</h4>
            <ul>
              <li>193 countries</li>
              <li> 110,000 cities</li>
              <li>5,000 states and provinces</li>
            </ul>
          </article>
          <article>
            <p>
              Over 240B data points across 260K variables from the{" "}
              <a
                href="https://www.who.int/"
                target="_blank"
                rel="noopener noreferrer"
              >
                World Health Organization
              </a>
              ,{" "}
              <a
                href="https://www.cdc.gov/index.htm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Centers for Disease Control and Prevention
              </a>
              ,{" "}
              <a
                href="https://www.census.gov/"
                target="_blank"
                rel="noopener noreferrer"
              >
                United States Census Bureau
              </a>
              ,{" "}
              <a
                href="https://ec.europa.eu/eurostat"
                target="_blank"
                rel="noopener noreferrer"
              >
                Eurostat
              </a>
              , and over 100 other agencies about economics, jobs, climate,
              health, demographics and more.
            </p>
          </article>
        </div>
        <div id="data-size-icon-container">
          <div id="data-size-icon"></div>
        </div>
      </div>
    </section>
  );
};

export default DataSize;
