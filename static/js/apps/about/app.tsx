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
 * Main component for the about page
 */

import React, { ReactElement } from "react";

import Hero from "../../components/content/hero_columns";
import MediaText from "../../components/content/media_text";
import Partners from "../../components/content/partners";
import Quote from "../../components/content/quote";
import SimpleText from "../../components/content/simple_text";
import { Routes } from "../../shared/types/base";
import { Partner } from "../../shared/types/homepage";

interface AppProps {
  //the partners passed from the backend through to the JavaScript via the templates
  partners: Partner[];
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Application container
 */
export function App({ partners, routes }: AppProps): ReactElement {
  console.log(partners);

  return (
    <>
      <Hero />
      <MediaText
        title="Your Data Commons at a glance"
        mediaType="image"
        mediaUrl="images/content/about_diagram.png"
      >
        <>
          <p>
            {" "}
            A custom instance natively joins your data and the base Data Commons
            data (from datacommons.org) in a unified fashion. Your users can
            visualize and analyze the data seamlessly without the need for
            further data preparation.
          </p>
          <p>
            You have full control over your own data and computing resources,
            with the ability to limit access to specific individuals or open it
            to the general public.
          </p>
          <p>
            Note that each new Data Commons is deployed using the Google Cloud
            Platform (GCP).{" "}
          </p>
        </>
      </MediaText>
      <hr className="separator" />
      <Quote />
      <Partners partners={partners} />
      <hr className="separator" />
      <SimpleText />
    </>
  );
}
