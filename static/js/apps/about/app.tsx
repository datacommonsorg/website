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

import { Routes } from "../../shared/types/base";
import { Partner } from "../../shared/types/homepage";
import Hero from "../base/components/content/hero_columns"
import TextImage from "../base/components/content/text_image"
import Quote from "../base/components/content/quote"
import Partners from "../base/components/content/partners";

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
      <TextImage />
      <hr className="separator"/>
      <Quote />
      <hr className="separator"/>
      <Partners partners={partners} />
    </>
  );
}