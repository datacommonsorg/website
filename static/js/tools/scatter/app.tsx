/**
 * Copyright 2020 Google LLC
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
 * Main app component for scatter.
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement, useContext, useEffect, useState } from "react";
import { Container, Row } from "reactstrap";

import { Spinner } from "../../components/spinner";
import { intl } from "../../i18n/i18n";
import { visualizationToolMessages } from "../../i18n/i18n_vis_tool_messages";
import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import theme from "../../theme/theme";
import { VisToolInstructionsBox } from "../shared/vis_tools/vis_tool_instructions_box";
import { ToolHeader } from "../shared/tool_header";
import { ChartLoader } from "./chart_loader";
import {
  Axis,
  Context,
  IsLoadingWrapper,
  PlaceInfo,
  useContextStore,
} from "./context";
import { MemoizedInfo } from "./info";
import { PlaceOptions } from "./place_and_type_options";
import { StatVarChooser } from "./statvar";
import {
  applyHash,
  areStatVarsPicked,
  isPlacePicked,
  updateHash,
} from "./util";

function App(): ReactElement {
  const { x, y, place, isLoading } = useContext(Context);
  const showChart = shouldShowChart(x.value, y.value, place.value);
  const showChooseStatVarMessage = shouldShowChooseStatVarMessage(
    x.value,
    y.value,
    place.value
  );
  const showInfo = !showChart && !showChooseStatVarMessage;
  const [isSvModalOpen, updateSvModalOpen] = useState(false);
  const toggleSvModalCallback = (): void => updateSvModalOpen(!isSvModalOpen);
  const useStandardizedUi = isFeatureEnabled(
    STANDARDIZED_VIS_TOOL_FEATURE_FLAG
  );
  return (
    <>
      <StatVarChooser
        openSvHierarchyModal={isSvModalOpen}
        openSvHierarchyModalCallback={toggleSvModalCallback}
      />
      <div id="plot-container">
        <Container fluid={true}>
          {!showChart && (
            <Row>
              {useStandardizedUi ? (
                <ToolHeader
                  title={intl.formatMessage(
                    visualizationToolMessages.scatterToolTitle
                  )}
                  subtitle={intl.formatMessage(
                    visualizationToolMessages.scatterToolSubtitle
                  )}
                  switchToolsUrl="/tools/visualization#visType%3Dscatter"
                />
              ) : (
                <div className="app-header">
                  <h1 className="mb-4">Scatter Plot Explorer</h1>
                  <a href="/tools/visualization#visType%3Dscatter">
                    Go back to the new Scatter Plot Explorer
                  </a>
                </div>
              )}
            </Row>
          )}
          <Row>
            <PlaceOptions toggleSvHierarchyModal={toggleSvModalCallback} />
          </Row>
          {showChooseStatVarMessage && (
            <Row className="info-message">
              Choose 2 statistical variables from the left pane.
            </Row>
          )}
          {showInfo && (
            <Row>
              {useStandardizedUi ? (
                <VisToolInstructionsBox multiVariable />
              ) : (
                <MemoizedInfo />
              )}
            </Row>
          )}
          {showChart && (
            <Row id="chart-row">
              <ChartLoader />
            </Row>
          )}
        </Container>
      </div>
      <Spinner isOpen={shouldDisplaySpinner(isLoading)} />
    </>
  );
}

function AppWithContext(): ReactElement {
  const store = useContextStore();

  useEffect(() => applyHash(store), []);
  useEffect(() => updateHash(store), [store]);
  window.onhashchange = (): void => applyHash(store);

  return (
    <ThemeProvider theme={theme}>
      <Context.Provider value={store}>
        <App />
      </Context.Provider>
    </ThemeProvider>
  );
}

/**
 * Returns whether the spinner should be shown.
 * @param isLoading
 */
function shouldDisplaySpinner(isLoading: IsLoadingWrapper): boolean {
  return (
    isLoading.arePlacesLoading ||
    isLoading.areStatVarsLoading ||
    isLoading.areDataLoading
  );
}

/**
 * Checks if the info page should be hidden to display the chart.
 * Returns true if the enclosing place, child place type,
 * and statvars for the x and y axes are selected.
 * @param x
 * @param y
 * @param place
 */
function shouldShowChart(x: Axis, y: Axis, place: PlaceInfo): boolean {
  return isPlacePicked(place) && areStatVarsPicked(x, y);
}

function shouldShowChooseStatVarMessage(
  x: Axis,
  y: Axis,
  place: PlaceInfo
): boolean {
  return isPlacePicked(place) && !areStatVarsPicked(x, y);
}

export { App, AppWithContext };
