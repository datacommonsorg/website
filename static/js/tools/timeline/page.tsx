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

import { css, ThemeProvider } from "@emotion/react";
import React, { Component, createRef, ReactElement, RefObject } from "react";
import { Container } from "reactstrap";

import { FormBox } from "../../components/form_components/form_box";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import {
  isFeatureEnabled,
  STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
} from "../../shared/feature_flags/util";
import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import { NamedPlace, StatVarHierarchyType } from "../../shared/types";
import theme from "../../theme/theme";
import { getPlaceNames } from "../../utils/place_utils";
import { PlaceSelect } from "../shared/place_selector/place_select";
import { StatVarHierarchyToggleButton } from "../shared/place_selector/stat_var_hierarchy_toggle_button";
import { StatVarWidget } from "../shared/stat_var_widget";
import { ToolHeader } from "../shared/tool_header";
import { ChartLinkChips } from "../shared/vis_tools/chart_link_chips";
import { VisToolInstructionsBox } from "../shared/vis_tools/vis_tool_instructions_box";
import { ChartRegion } from "./chart_region";
import { MemoizedInfo } from "./info";
import {
  addToken,
  getTokensFromUrl,
  placeSep,
  removeToken,
  setTokensToUrl,
  statVarSep,
  TIMELINE_URL_PARAM_KEYS,
} from "./util";

interface PageStateType {
  placeName: Record<string, string>;
  statVarInfo: Record<string, StatVarInfo>;
  // Whether the SV Hierarchy Modal is opened.
  showSvHierarchyModal: boolean;
}

class Page extends Component<unknown, PageStateType> {
  svHierarchyModalRef: RefObject<HTMLDivElement>;
  svHierarchyContainerRef: RefObject<HTMLDivElement>;

  constructor(props: unknown) {
    super(props);
    this.fetchDataAndRender = this.fetchDataAndRender.bind(this);
    this.state = {
      placeName: {},
      statVarInfo: {},
      showSvHierarchyModal: false,
    };
    // Set up refs and callbacks for sv widget modal. Widget is tied to the LHS
    // menu but reattached to the modal when it is opened on small screens.
    this.svHierarchyModalRef = createRef<HTMLDivElement>();
    this.svHierarchyContainerRef = createRef<HTMLDivElement>();
    this.onSvHierarchyModalClosed = this.onSvHierarchyModalClosed.bind(this);
    this.onSvHierarchyModalOpened = this.onSvHierarchyModalOpened.bind(this);
    this.toggleSvHierarchyModal = this.toggleSvHierarchyModal.bind(this);
  }

  componentDidMount(): void {
    window.addEventListener("hashchange", this.fetchDataAndRender);
    this.fetchDataAndRender();
  }

  render(): ReactElement {
    const numPlaces = Object.keys(this.state.placeName).length;
    const numStatVarInfo = Object.keys(this.state.statVarInfo).length;
    const namedPlaces: NamedPlace[] = [];
    for (const place in this.state.placeName) {
      namedPlaces.push({ dcid: place, name: this.state.placeName[place] });
    }
    const statVarTokens = Array.from(
      getTokensFromUrl(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep)
    );
    const statVars = statVarTokens.map((sv) =>
      sv.includes("|") ? sv.split("|")[0] : sv
    );

    const deselectSVs = (svList: string[]): void => {
      const availableSVs = statVars.filter((sv) => svList.indexOf(sv) === -1);
      const statVarTokenInfo = {
        name: TIMELINE_URL_PARAM_KEYS.STAT_VAR,
        sep: statVarSep,
        tokens: new Set(availableSVs),
      };
      setTokensToUrl([statVarTokenInfo]);
    };

    const svToSvInfo = {};
    for (const sv of statVars) {
      svToSvInfo[sv] =
        sv in this.state.statVarInfo ? this.state.statVarInfo[sv] : {};
    }

    const useStandardizedUi = isFeatureEnabled(
      STANDARDIZED_VIS_TOOL_FEATURE_FLAG
    );

    const showStatVarInstructions = numPlaces !== 0 && numStatVarInfo === 0;
    const showChart = numPlaces !== 0 && numStatVarInfo !== 0;

    return (
      <ThemeProvider theme={theme}>
        <StatVarWidget
          openSvHierarchyModal={this.state.showSvHierarchyModal}
          openSvHierarchyModalCallback={this.toggleSvHierarchyModal}
          collapsible={true}
          svHierarchyType={StatVarHierarchyType.SCATTER}
          sampleEntities={namedPlaces}
          deselectSVs={deselectSVs}
          selectedSVs={svToSvInfo}
          selectSV={(sv): void =>
            addToken(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep, sv)
          }
        />
        <div id="plot-container">
          <Container fluid={true}>
            {useStandardizedUi ? (
              <ToolHeader
                title={intl.formatMessage(toolMessages.timelineToolTitle)}
                subtitle={intl.formatMessage(toolMessages.timelineToolSubtitle)}
              />
            ) : (
              <div className="app-header">
                <h1 className="mb-4">
                  {intl.formatMessage(toolMessages.timelineToolTitle)}
                </h1>
                <a href="/tools/visualization#visType%3Dtimeline">
                  {intl.formatMessage(toolMessages.timelineToolGoBackMessage)}
                </a>
              </div>
            )}
            <div
              css={css`
                margin-bottom: ${theme.spacing.lg}px;
              `}
            >
              <FormBox>
                <PlaceSelect
                  selectedPlaces={this.state.placeName}
                  onPlaceSelected={(placeDcid: string): void => {
                    addToken(
                      TIMELINE_URL_PARAM_KEYS.PLACE,
                      placeSep,
                      placeDcid
                    );
                  }}
                  onPlaceUnselected={(placeDcid: string): void => {
                    removeToken(
                      TIMELINE_URL_PARAM_KEYS.PLACE,
                      placeSep,
                      placeDcid
                    );
                  }}
                  searchBarInstructionText={intl.formatMessage(
                    toolMessages.enterPotentiallyMultiplePlacesInstruction
                  )}
                />
                <StatVarHierarchyToggleButton
                  onClickCallback={this.toggleSvHierarchyModal}
                  text={"Select variable(s)"}
                />
              </FormBox>
            </div>
            {!showChart &&
              (useStandardizedUi ? (
                <>
                  <VisToolInstructionsBox
                    toolType="timeline"
                    showStatVarInstructionsOnly={showStatVarInstructions}
                  />
                  {!showStatVarInstructions && (
                    <div
                      css={css`
                        margin-top: ${theme.spacing.xl}px;
                      `}
                    >
                      <ChartLinkChips toolType="timeline" />
                    </div>
                  )}
                </>
              ) : (
                <MemoizedInfo />
              ))}
            {showChart && (
              <div id="chart-region">
                <ChartRegion
                  placeName={this.state.placeName}
                  statVarInfo={this.state.statVarInfo}
                  statVarOrder={statVars}
                ></ChartRegion>
              </div>
            )}
          </Container>
        </div>
      </ThemeProvider>
    );
  }

  private fetchDataAndRender(): void {
    const places = Array.from(
      getTokensFromUrl(TIMELINE_URL_PARAM_KEYS.PLACE, placeSep)
    );
    const statVars = Array.from(
      getTokensFromUrl(TIMELINE_URL_PARAM_KEYS.STAT_VAR, statVarSep)
    );
    let statVarInfoPromise = Promise.resolve({});
    if (statVars.length !== 0) {
      statVarInfoPromise = getStatVarInfo(statVars);
    }
    let placesPromise = Promise.resolve({});
    if (places.length !== 0) {
      placesPromise = getPlaceNames(places);
    }
    Promise.all([statVarInfoPromise, placesPromise]).then(
      ([statVarInfo, placeName]) => {
        // Schemaless stat vars are not associated with any triples.
        // Assign the measured property to be the DCID so the chart can be
        // grouped (by measured property).
        for (const statVar of statVars) {
          if (!(statVar in statVarInfo)) {
            statVarInfo[statVar] = { mprop: statVar };
          }
        }
        this.setState({
          statVarInfo,
          placeName,
        });
      }
    );
  }

  private toggleSvHierarchyModal(): void {
    this.setState({
      showSvHierarchyModal: !this.state.showSvHierarchyModal,
    });
  }

  private onSvHierarchyModalOpened(): void {
    if (
      this.svHierarchyModalRef.current &&
      this.svHierarchyContainerRef.current
    ) {
      this.svHierarchyModalRef.current.appendChild(
        this.svHierarchyContainerRef.current
      );
    }
  }

  private onSvHierarchyModalClosed(): void {
    document
      .getElementById("explore")
      .appendChild(this.svHierarchyContainerRef.current);
  }
}

export { Page };
