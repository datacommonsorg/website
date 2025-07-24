/**
 * Copyright 2021 Google LLC
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
 * Main app component for map explorer.
 */

import { ThemeProvider } from "@emotion/react";
import React, { ReactElement, useEffect, useState } from "react";
import { Container, Row } from "reactstrap";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import theme from "../../theme/theme";
import { ToolHeader } from "../shared/tool_header";
import { VisToolInstructionsBox } from "../shared/vis_tools/vis_tool_instructions_box";
import { ChartLoader } from "./chart_loader";
import { Context, ContextType, useInitialContext } from "./context";
import { Info } from "./info";
import { PlaceOptions } from "./place_options";
import { StatVarChooser } from "./stat_var_chooser";
import { Title } from "./title";
import {
  ALLOW_LEAFLET_URL_ARG,
  applyHashDate,
  applyHashDisplay,
  applyHashPlaceInfo,
  applyHashStatVar,
  MAP_URL_PATH,
  updateHashDisplay,
  updateHashPlaceInfo,
  updateHashStatVar,
} from "./util";

function App(): ReactElement {
  const [isSvModalOpen, updateSvModalOpen] = useState(false);
  const toggleSvModalCallback = (): void => updateSvModalOpen(!isSvModalOpen);
  const useStandardizedUi = isFeatureEnabled(
    STANDARDIZED_VIS_TOOL_FEATURE_FLAG
  );

  return (
    <React.StrictMode>
      <StatVarChooser
        openSvHierarchyModal={isSvModalOpen}
        openSvHierarchyModalCallback={toggleSvModalCallback}
      />
      <div id="plot-container" className={ASYNC_ELEMENT_HOLDER_CLASS}>
        <Container fluid={true}>
          <Row>
            {useStandardizedUi ? (
              <ToolHeader
                title={intl.formatMessage(toolMessages.mapToolTitle)}
                subtitle={intl.formatMessage(toolMessages.mapToolSubtitle)}
                switchToolsUrl="/tools/visualization#visType%3Dmap"
              />
            ) : (
              <Title />
            )}
          </Row>
          <Row>
            <PlaceOptions toggleSvHierarchyModal={toggleSvModalCallback} />
          </Row>
          <Row>{useStandardizedUi ? <VisToolInstructionsBox /> : <Info />}</Row>
          <Row id="chart-row">
            <ChartLoader />
          </Row>
        </Container>
      </div>
    </React.StrictMode>
  );
}

export function AppWithContext(): ReactElement {
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  const store = useInitialContext(params);

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

function applyHash(context: ContextType): void {
  // When url formation is updated here, make sure to also update the
  // getRedirectLink function in ./util.ts
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  context.placeInfo.set(applyHashPlaceInfo(params));
  context.statVar.set(applyHashStatVar(params));
  context.dateCtx.set(applyHashDate(params));
  context.display.set(applyHashDisplay(params));
}

function updateHash(context: ContextType): void {
  let hash = updateHashStatVar("", context.statVar.value);
  hash = updateHashPlaceInfo(hash, context.placeInfo.value);
  hash = updateHashDisplay(hash, context.display.value);
  // leaflet flag is part of the search arguments instead of hash, so need to
  // update that separately
  // TODO: forward along all args and then append hash in the url.
  let args = "";
  if (context.display.value.allowLeaflet) {
    args += `?${ALLOW_LEAFLET_URL_ARG}=1`;
  }
  const newHash = encodeURIComponent(hash);
  const currentHash = location.hash.replace("#", "");
  const currentArgs = location.search;
  if (newHash && (newHash !== currentHash || args !== currentArgs)) {
    history.pushState({}, "", `${MAP_URL_PATH}${args}#${newHash}`);
  }
}
