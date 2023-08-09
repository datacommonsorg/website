/**
 * Copyright 2023 Google LLC
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
 * Config for the map vis type.
 */

import _ from "lodash";
import React from "react";

import { highlightPlaceToggle } from "../../../chart/draw_map_utils";
import { MapTile } from "../../../components/tiles/map_tile";
import { RankingTile } from "../../../components/tiles/ranking_tile";
import { GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA } from "../../../shared/ga_events";
import { StatVarHierarchyType } from "../../../shared/types";
import { getNonPcQuery, getPcQuery } from "../../../tools/map/bq_query_utils";
import { getAllChildPlaceTypes } from "../../../tools/map/util";
import { MemoizedInfoExamples } from "../../../tools/shared/info_examples";
import {
  getStatVarSpec,
  isSelectionComplete,
} from "../../../utils/app/visualization_utils";
import { AppContextType } from "../app_context";
import { ChartFooter } from "../chart_footer";
import { VisType } from "../vis_type_configs";

export function getChartArea(
  appContext: AppContextType,
  chartHeight: number
): JSX.Element {
  const perCapitaInputs = appContext.statVars[0].info.pcAllowed
    ? [
        {
          isChecked: appContext.statVars[0].isPerCapita,
          onUpdated: (isChecked: boolean) => {
            const newStatVars = _.cloneDeep(appContext.statVars);
            newStatVars[0].isPerCapita = isChecked;
            appContext.setStatVars(newStatVars);
          },
          label: "Per Capita",
          gaEventParam: GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
        },
      ]
    : [];
  const statVarLabel =
    appContext.statVars[0].info.title || appContext.statVars[0].dcid;
  const statVarSpec = getStatVarSpec(appContext.statVars[0], VisType.MAP);
  const date = appContext.statVars[0].date || "";
  return (
    <>
      <div className="chart">
        <MapTile
          id="vis-tool-map"
          place={appContext.places[0]}
          statVarSpec={statVarSpec}
          enclosedPlaceType={appContext.enclosedPlaceType}
          svgChartHeight={chartHeight}
          title={statVarLabel + " (${date})"}
          showLoadingSpinner={true}
          date={date}
          allowZoom={true}
        />
        <ChartFooter inputSections={[{ inputs: perCapitaInputs }]} />
      </div>
      <div className="chart">
        <RankingTile
          id="vis-tool-ranking"
          place={appContext.places[0]}
          enclosedPlaceType={appContext.enclosedPlaceType}
          title=""
          statVarSpec={[statVarSpec]}
          rankingMetadata={{
            showHighest: true,
            showLowest: true,
            diffBaseDate: "",
            showMultiColumn: false,
            highestTitle: "Top Places",
            lowestTitle: "Bottom Places",
          }}
          hideFooter={true}
          onHoverToggled={(placeDcid, hover) => {
            highlightPlaceToggle(
              document.getElementById("vis-tool-map"),
              placeDcid,
              hover
            );
          }}
          date={date}
          showLoadingSpinner={true}
        />
      </div>
    </>
  );
}

function getInfoContent(): JSX.Element {
  return (
    <div className="info-content">
      <div>
        <h3>Map Explorer</h3>
        <p>
          The map explorer helps you visualize how a statistical variable can
          vary across geographic regions.
        </p>
      </div>
      <div>
        <p>
          You can start your exploration from one of these interesting points
          ...
        </p>
        <MemoizedInfoExamples configKey="map" />
      </div>
      <p>Or click start to build your own map.</p>
    </div>
  );
}

function getSqlQueryFn(appContext: AppContextType): () => string {
  return () => {
    if (
      !isSelectionComplete(
        VisType.MAP,
        appContext.places,
        appContext.enclosedPlaceType,
        appContext.statVars
      )
    ) {
      return "";
    }
    const contextStatVar = appContext.statVars[0];
    const statVarSpec = getStatVarSpec(contextStatVar, VisType.MAP);
    if (statVarSpec.denom) {
      return getPcQuery(
        statVarSpec.statVar,
        statVarSpec.denom,
        appContext.places[0].dcid,
        appContext.enclosedPlaceType,
        contextStatVar.date,
        {}
      );
    } else {
      return getNonPcQuery(
        statVarSpec.statVar,
        appContext.places[0].dcid,
        appContext.enclosedPlaceType,
        contextStatVar.date,
        {}
      );
    }
  };
}

export const MAP_CONFIG = {
  displayName: "Map Explorer",
  icon: "public",
  svHierarchyType: StatVarHierarchyType.MAP,
  svHierarchyNumExistence: 10,
  singlePlace: true,
  getChildTypesFn: getAllChildPlaceTypes,
  numSv: 1,
  getChartArea,
  getInfoContent,
  getSqlQueryFn,
};
