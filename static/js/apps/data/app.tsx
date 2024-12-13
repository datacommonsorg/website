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
 * Main component for the Data Sources page
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";

import { IntroText } from "../../components/content/intro_text";
import { Section } from "../../components/elements/layout/section";
import theme from "../../theme/theme";
import { DataSources } from "./components/data_sources";

/**
 * Application container
 */

export function App(): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <Section>
        <IntroText>
          <header>
            <h1>Data sources</h1>
            <p>
              Data Commons search Enter your question, keywords, or places
              search Overview Tools Documentation About Feedback
            </p>
          </header>
        </IntroText>
      </Section>
      <Section>
        <DataSources />
      </Section>
    </ThemeProvider>
  );
}
