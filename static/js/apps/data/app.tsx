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
 * Main component for the Data Sources page
 */

/** @jsxImportSource @emotion/react */

import { css, ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";

import { IntroText } from "../../components/content/intro_text";
import { Section } from "../../components/elements/layout/section";
import theme from "../../theme/theme";
import { DataSources, DataSourceTopic } from "./components/data_sources";
import dataSourceData from "./data_sources.json";

const dataSources: DataSourceTopic[] = dataSourceData;

/**
 * Application container
 */

export function App(): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <Section variant="compact">
        <IntroText>
          <>
            {" "}
            <h1
              css={css`
                ${theme.typography.family.heading};
                ${theme.typography.heading.md};
              `}
            >
              Data sources
            </h1>
            <h3
              css={css`
                ${theme.typography.family.text};
                ${theme.typography.text.lg};
              `}
            >
              Data Commons harmonizes public data from many places around the
              world, including surveys. These sources are organized into
              categories below. Not all data may be available yet.
            </h3>
          </>
        </IntroText>
      </Section>
      <Section>
        <DataSources dataSources={dataSources} />
      </Section>
    </ThemeProvider>
  );
}
