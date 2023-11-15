/**
 * Copyright 2022 Google LLC
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
import { Button } from "reactstrap";

import { TEMPLATE_OPTIONS } from "../templates";

interface InfoProps {
  onStartClicked: () => void;
}

export function Info(props: InfoProps): JSX.Element {
  return (
    <div className="info-page-content">
      <h3>Welcome to the Data Commons Import Wizard!</h3>
      <p>
        To get started you will first need to choose between a schema-full
        (recommended) or schema-less import. You can learn more on the full
        process to add a dataset{" "}
        <a href="https://github.com/datacommonsorg/data/tree/master/docs">
          here
        </a>
        .
      </p>
      <p>
        Once any entity and/or required schema mapping have been finalized, and
        any StatisticalVariable MCF nodes are checked into the{" "}
        <a href="https://github.com/datacommonsorg/schema/tree/main/stat_vars">
          schema repo
        </a>
        , you are ready to use this wizard to expedite the import process for
        your datasets!{" "}
      </p>
      <div>
        Before starting the wizard, you will need
        <ul>
          <li>
            A dataset that follows one of the supported templates:
            <ul>
              {Object.values(TEMPLATE_OPTIONS).map((template, idx) => {
                return (
                  <li
                    key={`template-${idx}`}
                  >{`${template.title}, ${template.subtitle}`}</li>
                );
              })}
            </ul>
          </li>
        </ul>
      </div>
      <div>
        Once completed, you will receive the following artifacts
        <ul>
          <li>A generated TMCF file</li>
          <li>A mapping metadata file</li>
          <li>
            {
              "A cleaned CSV file (if there are any changes to the original CSV file)"
            }
          </li>
        </ul>
      </div>

      <Button className="nav-btn" onClick={props.onStartClicked}>
        Start
      </Button>
    </div>
  );
}
