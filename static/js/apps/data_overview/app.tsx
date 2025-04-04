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
 * Main component for the Place Data Overview page.
 * This is currently a mock page to demonstrate the components
 */

/** @jsxImportSource @emotion/react */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement } from "react";

import { Section } from "../../components/elements/layout/section";
import theme from "../../theme/theme";
import { DataOverviewPage } from "./components/data_overview_page";
import { PlaceDataOverview } from "./place_data";
import placeDataOverviewData from "./place_data.json";

const placeDataOverview: PlaceDataOverview = placeDataOverviewData;

/**
 * Application container
 */

interface AppProps {
  //the place dcid for the place whose overview will be rendered
  placeDcid: string;
}

export function App(props: AppProps): ReactElement {
  const dcid = props.placeDcid;

  return (
    <ThemeProvider theme={theme}>
      {!placeDataOverview[dcid] ? (
        <Section>Place not found.</Section>
      ) : (
        <DataOverviewPage placeData={placeDataOverview[dcid]} />
      )}
    </ThemeProvider>
  );
}
