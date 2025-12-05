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

import Search from "../../components/content/search";
import { Tools } from "../../components/content/tools";
import { Section } from "../../components/elements/layout/section";
import { Routes } from "../../shared/types/base";
import theme from "../../theme/theme";

interface AppProps {
  routes: Routes;
}

/**
 * Default Custom DC application container
 */
export function App({ routes }: AppProps): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <Section colorVariant="light" variant="large">
        <Search />
      </Section>

      <Section variant="small">
        <Tools
          routes={routes}
          tools={["statVarExplorer", "timeline"]}
          showDescriptions
        />
      </Section>
    </ThemeProvider>
  );
}
