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
 * The app that renders the footer component on all pages via the base template
 */

import React, { ReactElement } from "react";

import { Labels, Routes } from "../../shared/types/base";
import Footer from "./components/footer";

interface FooterAppProps {
  //if true, will display an alternate, lighter version of the logo.
  brandLogoLight: boolean;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Footer application container
 */
export function FooterApp({
  brandLogoLight,
  labels,
  routes,
}: FooterAppProps): ReactElement {
  return (
    <Footer brandLogoLight={brandLogoLight} labels={labels} routes={routes} />
  );
}
