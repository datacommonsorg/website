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

/**
 * Component for NL interface welcome message.
 */
import React from "react";
import { Container } from "reactstrap";

/**
 * NL Chat welcome message
 */
export function QueryWelcome(): JSX.Element {
  return (
    <div className="nl-welcome">
      <Container>
        <div className="mb-2">
          <span className="nl-result-icon">
            <img src="/images/logo.png" />
          </span>
          Hi, I{"'"}m{" "}
          <a
            href="https://datacommons.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Data Commons
          </a>{" "}
          chat, your data companion.
        </div>
        <div className="mb-2">
          I use public data to answer questions about the environment,
          sustainability, health, education, demographics, and the economy. I
          may not know everything, but your feedback will help me improve.
        </div>
        <div>
          Not sure where to start? Try these queries:
          <ul>
            <li>
              <a href="/nl/#a=1&d=1&q=Which%20countries%20emit%20the%20most%20greenhouse%20gases?">
                Which countries emit the most greenhouse gases?
              </a>
            </li>
            <li>
              <a href="/nl/#a=1&d=1&q=Which%20counties%20in%20California%20are%20most%20impacted%20by%20climate%20change?">
                Which counties in California are most impacted by climate
                change?
              </a>
            </li>
            <li>
              <a href="/nl/#a=1&d=1&q=Which%20US%20cities%20are%20facing%20extreme%20poverty?">
                Which US cities are facing extreme poverty?
              </a>
            </li>
          </ul>
        </div>
      </Container>
    </div>
  );
}
