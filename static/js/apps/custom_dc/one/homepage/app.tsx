/**
 * Copyright 2025 Google LLC
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
 * Main component for the homepage.
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";
import theme from "theme";

import { Section } from "../../../../components/elements/layout/section";
import { Footer } from "../base/components/footer";
import { HomeHero } from "./components/home_hero";
import { Tools } from "./components/tools";

interface AppProps {
  //the root of the primary data.one.org site
  primarySiteWebRoot: string;
}

/**
 * One.org: Home application container
 */
export function App({ primarySiteWebRoot }: AppProps): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <Section colorVariant="light" variant="large">
        <HomeHero />
      </Section>
      <Section>
        <Tools primarySiteWebRoot={primarySiteWebRoot} />
      </Section>
      <Footer primarySiteWebRoot={primarySiteWebRoot} />
    </ThemeProvider>
  );
}
