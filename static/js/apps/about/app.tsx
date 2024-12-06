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
 * Main component for the about your own Data Commons page
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";

import { Section } from "../../components/elements/layout/section";
import { Routes } from "../../shared/types/base";
import theme from "../../theme/theme";
import { Collaborations } from "./components/collaborations";
import { SplashQuote } from "./components/splash_quote";
import { StayInTouch } from "./components/stay_in_touch";
import { WhoCanUse } from "./components/who_can_use";
import { WhyDataCommons } from "./components/why_data_commons";

interface AppProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Application container
 */

export function App({ routes }: AppProps): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <Section colorVariant="light" variant="large">
        <SplashQuote />
      </Section>

      <Section>
        <WhyDataCommons />
      </Section>

      <Section>
        <WhoCanUse />
      </Section>

      <Section>
        <Collaborations />
      </Section>

      <Section>
        <StayInTouch routes={routes} />
      </Section>
    </ThemeProvider>
  );
}
