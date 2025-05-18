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
import React, { ReactElement } from "react";

import { highlightPlaceToggle } from "../../../chart/draw_map_utils";
import { MapTile } from "../../../components/tiles/map_tile";
import { RankingTile } from "../../../components/tiles/ranking_tile";
import { FacetSelector } from "../../../shared/facet_selector";
import { GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA } from "../../../shared/ga_events";
import { StatMetadata } from "../../../shared/stat_types";
import { StatVarHierarchyType } from "../../../shared/types";
import { getAllChildPlaceTypes } from "../../../tools/map/util";
import { MemoizedInfoExamples } from "../../../tools/shared/info_examples";
import { getStatVarSpec } from "../../../utils/app/visualization_utils";
import { getFacetsWithin } from "../../../utils/data_fetch_utils";
import { AppContextType } from "../app_context";
import { ChartFooter } from "../chart_footer";
import { VisType } from "../vis_type_configs";

function getFacetSelector(appContext: AppContextType): ReactElement {
  const statVar = appContext.statVars[0];
  const svFacetId = { [statVar.dcid]: statVar.facetId };
  const facetListPromise = getFacetsWithin(
    "",
    appContext.places[0].dcid,
    appContext.enclosedPlaceType,
    [statVar.dcid],
    statVar.date
  ).then((resp) => {
    return [
      {
        dcid: statVar.dcid,
        name: statVar.info.title || statVar.dcid,
        metadataMap: resp[statVar.dcid],
      },
    ];
  });
  const onSvFacetIdUpdated = (
    svFacetId: Record<string, string>,
    metadataMap: Record<string, StatMetadata>
  ): void => {
    if (
      svFacetId[statVar.dcid] === statVar.facetId ||
      _.isEmpty(appContext.statVars)
    ) {
      return;
    }
    const newStatVars = _.cloneDeep(appContext.statVars);
    const facetId = svFacetId[newStatVars[0].dcid];
    newStatVars[0].facetId = svFacetId[newStatVars[0].dcid];
    newStatVars[0].facetInfo = metadataMap[facetId];
    appContext.setStatVars(newStatVars);
  };
  return (
    <FacetSelector
      svFacetId={svFacetId}
      facetListPromise={facetListPromise}
      onSvFacetIdUpdated={onSvFacetIdUpdated}
    />
  );
}

export function getChartArea(
  appContext: AppContextType,
  chartHeight: number
): ReactElement {
  const perCapitaInputs = appContext.statVars[0].info.pcAllowed
    ? [
        {
          isChecked: appContext.statVars[0].isPerCapita,
          onUpdated: (isChecked: boolean): void => {
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
  return (
    <div>
      <div>{getFacetSelector(appContext)}</div>
      <div className="chart">
        <MapTile
          id="vis-tool-map"
          place={appContext.places[0]}
          statVarSpec={statVarSpec}
          enclosedPlaceType={appContext.enclosedPlaceType}
          svgChartHeight={chartHeight}
          title={statVarLabel + " (${date})"}
          allowZoom={true}
        />
        <ChartFooter inputSections={[{ inputs: perCapitaInputs }]} />
      </div>
      <div className="chart">
        <RankingTile
          id="vis-tool-ranking"
          parentPlace={appContext.places[0].dcid}
          enclosedPlaceType={appContext.enclosedPlaceType}
          title=""
          variables={[statVarSpec]}
          rankingMetadata={{
            showHighest: true,
            showLowest: true,
            showMultiColumn: false,
            highestTitle: "Top Places",
            lowestTitle: "Bottom Places",
          }}
          hideFooter={true}
          onHoverToggled={(placeDcid, hover): void => {
            highlightPlaceToggle(
              document.getElementById("vis-tool-map"),
              placeDcid,
              hover
            );
          }}
        />
      </div>
    </div>
  );
}

function getInfoContent(): ReactElement {
  const hideExamples = _.isEmpty(window.infoConfig["map"]);
  return (
    <div className="info-content">
      <div>
        <h3>Map Explorer</h3>
        <p>
          The map explorer helps you visualize how a statistical variable can
          vary across geographic regions.
        </p>
      </div>
      {!hideExamples && (
        <div>
          <p>
            You can start your exploration from one of these interesting points
            ...
          </p>
          <MemoizedInfoExamples configKey="map" />
        </div>
      )}
      <p>{hideExamples ? "Click" : "Or click"} start to build your own map.</p>
    </div>
  );
}

function getFooter(): string {
  const footer = document.getElementById("metadata").dataset.mapFooter || "";
  return footer ? `* ${footer}` : "";
}

export const MAP_CONFIG = {
  displayName: "Map Explorer",
  svHierarchyType: StatVarHierarchyType.MAP,
  svHierarchyNumExistence: globalThis.minStatVarGeoCoverage,
  singlePlace: true,
  getChildTypesFn: getAllChildPlaceTypes,
  numSv: 1,
  getChartArea,
  getInfoContent,
  oldToolUrl: "/tools/map",
  getFooter,
};
