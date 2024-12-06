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
 * A component to display the "Data Commons at a Glance" section of the build page
 */

/** @jsxImportSource @emotion/react */

import React, { ReactElement } from "react";

import { MediaText } from "../../../components/content/media_text";

export const DataCommonsGlance = (): ReactElement => {
  return (
    <MediaText
      mediaType="image"
      mediaSource="images/content/build/build_diagram.png"
      header="Your Data Commons at a glance"
      headerComponent="h3"
      imageAlt="Graph describing the query process, from the user queries going trough the custom data commons installation then using the rest api to communicate with the base data commons to return the data to the custom data commons installation"
    >
      <>
        <p>
          A custom instance natively joins your data and the base Data Commons
          data (from datacommons.org) in a unified fashion. Your users can
          visualize and analyze the data seamlessly without the need for further
          data preparation.
        </p>
        <p>
          You have full control over your own data and computing resources, with
          the ability to limit access to specific individuals or open it to the
          general public.
        </p>
        <p>
          Note that each new Data Commons is deployed using the Google Cloud
          Platform (GCP).
        </p>
      </>
    </MediaText>
  );
};
