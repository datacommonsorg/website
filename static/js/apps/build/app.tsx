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
 * Main component for the build page
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";

import Partners from "../../components/content/partners";
import { Section } from "../../components/elements/layout/section";
import { Separator } from "../../components/elements/layout/separator";
import { GA_EVENT_BUILDPAGE_CLICK } from "../../shared/ga_events";
import { Partner } from "../../shared/types/homepage";
import theme from "../../theme/theme";
import { BuildHero } from "./components/build_hero";
import { DataCommonsGlance } from "./components/data_commons_glance";
import { GetStarted } from "./components/get_started";
import { OneDataCommons } from "./components/one_data_commons";
import { OneQuote } from "./components/one_quote";

interface AppProps {
  //the partners passed from the backend through to the JavaScript via the templates
  partners: Partner[];
}

/**
 * Application container
 */
export function App({ partners }: AppProps): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <Section colorVariant="dark" variant="large">
        <BuildHero />
      </Section>

      <Section>
        <DataCommonsGlance />
      </Section>

      <Separator />

      <Section>
        <OneQuote />
      </Section>

      <Section colorVariant="light" variant="small">
        <OneDataCommons />
      </Section>

      <Section>
        <Partners partners={partners} gaEvent={GA_EVENT_BUILDPAGE_CLICK} />
      </Section>

      <Separator />

      <Section>
        <GetStarted />
      </Section>
    </ThemeProvider>
  );
}
