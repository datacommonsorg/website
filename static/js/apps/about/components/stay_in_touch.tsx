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
 * A component to display the "Stay in Touch" section of the about page
 */

import React, { ReactElement } from "react";

import { TextColumns } from "../../../components/content/text_columns";
import { Routes } from "../../../shared/types/base";

interface StayInTouchProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

export const StayInTouch = ({ routes }: StayInTouchProps): ReactElement => {
  return (
    <TextColumns>
      <TextColumns.Left>
        <h3>Stay in touch</h3>
        <p>
          Stay informed about the latest Data Commons developments: visit our
          blog or sign up for our mailing list
        </p>
        <a
          href="https://groups.google.com/g/datacommons-announce"
          className="btn btn-primary"
        >
          Join the mailing list
        </a>
      </TextColumns.Left>
      <TextColumns.Right>
        <h3>See Also</h3>
        <ul>
          <li>
            <a href="https://docs.datacommons.org/datasets/">Data Sources</a>
          </li>
          <li>
            <a href={routes["static.faq"]}>Frequently Asked Questions</a>
          </li>
          <li>
            <a href="https://blog.datacommons.org/">Blog</a>
          </li>
        </ul>
      </TextColumns.Right>
    </TextColumns>
  );
};
