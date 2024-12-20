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
 * A component to display the "Who Can Use It" section of the about page
 */

/** @jsxImportSource @emotion/react */

import React, { ReactElement } from "react";

import { MediaText } from "../../../components/content/media_text";
import { Routes } from "../../../shared/types/base";

interface WhoCanUseProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

export const WhoCanUse = ({ routes }: WhoCanUseProps): ReactElement => {
  return (
    <MediaText
      mediaType="video"
      mediaSource="O6iVsS-RDYI"
      header="Who can use it"
      headerComponent="h3"
    >
      <p>
        Data Commons can be accessed by anyone here at{" "}
        <a href={routes["static.homepage"]}>Datacommons.org</a>. Students,
        researchers, journalists, non profits, policymakers, and private
        enterprises can access the tools and allow them to manipulate and make
        decisions based on data without the need to know how to code. Software
        developers can use the REST, Python and Google Sheets APIs, all of which
        are free for educational, academic and journalistic research purposes.
      </p>
    </MediaText>
  );
};
