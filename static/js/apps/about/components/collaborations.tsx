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
 * A component to display the "Collaborations" section of the about page
 */

import React, { ReactElement } from "react";

import { TextColumns } from "../../../components/content/text_columns";

export const Collaborations = (): ReactElement => {
  return (
    <TextColumns header="Collaborations">
      <TextColumns.Left>
        <p>
          Data Commons has benefited greatly from many collaborations. In
          addition to help from US Department of Commerce (notably the Census
          Bureau), we have received help from our many academic collaborations,
          including, University of California San Francisco, Stanford
          University, University of California Berkeley, Harvard University and
          Indian Institute of Technology Madras. We have also collaborated with
          nonprofits such as Techsoup, Feeding America, and Resources for the
          Future.
        </p>
      </TextColumns.Left>
      <TextColumns.Right>
        <p>
          We are looking for more collaborators, both for adding new data to
          Data Commons and for building new and interesting applications of Data
          Commons. Please fill out this form if you are interested in working
          with us.
        </p>
      </TextColumns.Right>
    </TextColumns>
  );
};
