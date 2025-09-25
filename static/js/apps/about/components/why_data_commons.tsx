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
 * A component to display the "Why Data Commons" section of the about page
 */

import React, { ReactElement } from "react";

import { TextColumns } from "../../../components/content/text_columns";

export const WhyDataCommons = (): ReactElement => {
  return (
    <TextColumns header="Why Data Commons">
      <TextColumns.Left>
        <p>
          Many of the big challenges we face — climate change, increasing
          inequities, epidemics of diabetes and other health conditions — will
          need deep insights to solve. These insights will need to be firmly
          grounded in data. Fortunately, a lot of this data is already publicly
          available. Unfortunately, there is a difference between data being
          public and data being easily usable by those who need access to it. It
          is this gap that we are trying to bridge. Google has organized and
          made easily accessible many kinds of information — web pages, images,
          maps, videos and so on. Now we are doing this for publicly available
          data. We have organized the core of this data from a wide range of
          sources, ranging from governmental statistical organizations like
          census bureaus to organizations like the World Bank and the United
          Nations. And recent advances in AI have enabled us to go much farther
          than we had thought possible in making this data easily accessible -
          now you can use natural language to access the data.
        </p>
      </TextColumns.Left>
      <TextColumns.Right>
        <p>
          Data Commons synthesizes a single graph from these different data
          sources. It links references to the same entities (such as cities,
          counties, organizations, etc.) across different datasets to nodes on
          the graph, so that users can access data about a particular entity
          aggregated from different sources without data cleaning or joining.{" "}
        </p>
        <p>
          <strong>
            We hope the data contained within Data Commons will be useful to
            students, researchers, and enthusiasts across different disciplines.
          </strong>
        </p>
      </TextColumns.Right>
    </TextColumns>
  );
};
