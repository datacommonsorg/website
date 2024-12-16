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
 * Config for the timeline vis type.
 */

import _ from "lodash";
import React from "react";

import { LineTile } from "../../../components/tiles/line_tile";
import { Chip } from "../../../shared/chip";
import { FacetSelector } from "../../../shared/facet_selector";
import { GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA } from "../../../shared/ga_events";
import { StatVarHierarchyType } from "../../../shared/types";
import { MemoizedInfoExamples } from "../../../tools/shared/info_examples";
import { getStatVarGroups } from "../../../utils/app/timeline_utils";
import { getStatVarSpec } from "../../../utils/app/visualization_utils";
import { getFacets } from "../../../utils/data_fetch_utils";
import { AppContextType, ContextStatVar } from "../app_context";
import { ChartFooter } from "../chart_footer";
import { VisType } from "../vis_type_configs";

const COLORS = [
  "#930000",
  "#5e4fa2",
  "#fee08b",
  "#66c2a5",
  "#3288bd",
  "#d30000",
  "#f46d43",
  "#fdae61",
];

function getSvChips(
  statVars: ContextStatVar[],
  appContext: AppContextType
): JSX.Element {
  return (
    <div className="timeline-chip-section">
      {statVars.map((sv, idx) => {
        return (
          <Chip
            key={sv.dcid}
            id={sv.dcid}
            title={sv.info.title || sv.dcid}
            color={
              appContext.places.length == 1 ? COLORS[idx % COLORS.length] : ""
            }
            removeChip={(): void => {
              appContext.setStatVars(
                appContext.statVars.filter(
                  (statVar) => statVar.dcid !== sv.dcid
                )
              );
            }}
            onTextClick={null}
          />
        );
      })}
    </div>
  );
}

function groupStatVars(appContext: AppContextType): {
  groups: { [key: string]: string[] };
  chartOrder: string[];
} {
  const statVarInfo = {};
  appContext.statVars.forEach((sv) => (statVarInfo[sv.dcid] = sv.info));
  const lineChartGrouping = getStatVarGroups(
    appContext.statVars.map((sv) => sv.dcid),
    statVarInfo,
    new Set(
      appContext.statVars.filter((sv) => sv.isPerCapita).map((sv) => sv.dcid)
    )
  );
  return lineChartGrouping;
}

function getFacetSelector(
  appContext: AppContextType,
  chartSvInfo: ContextStatVar[]
): JSX.Element {
  const svFacetId = {};
  chartSvInfo.forEach((sv) => {
    svFacetId[sv.dcid] = sv.facetId;
  });
  const facetListPromise = getFacets(
    "",
    appContext.places.map((place) => place.dcid),
    chartSvInfo.map((sv) => sv.dcid)
  ).then((resp) => {
    const result = chartSvInfo.map((sv) => {
      return {
        dcid: sv.dcid,
        name: sv.info.title || sv.dcid,
        metadataMap: resp[sv.dcid] || {},
      };
    });
    return result;
  });
  const chartSvs = new Set(chartSvInfo.map((sv) => sv.dcid));
  const onSvFacetIdUpdated = (svFacetId: Record<string, string>) => {
    const facetsChanged = chartSvInfo.filter(
      (sv): boolean => sv.facetId !== svFacetId[sv.dcid]
    );
    if (_.isEmpty(facetsChanged)) {
      return;
    }
    const newStatVars = _.cloneDeep(appContext.statVars);
    appContext.statVars.forEach((sv, idx) => {
      if (chartSvs.has(sv.dcid) && sv.dcid in svFacetId) {
        newStatVars[idx].facetId = svFacetId[sv.dcid];
      }
    });
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

function getChartArea(
  appContext: AppContextType,
  chartHeight: number
): JSX.Element {
  const lineChartGrouping = groupStatVars(appContext);
  return (
    <>
      {lineChartGrouping.chartOrder.map((chartId) => {
        const chartSvs = new Set(lineChartGrouping.groups[chartId]);
        const chartSvInfo = appContext.statVars.filter((sv) =>
          chartSvs.has(sv.dcid)
        );
        const chartSvSpecs = chartSvInfo.map((sv) =>
          getStatVarSpec(sv, VisType.TIMELINE)
        );
        // If any svs in the chart do not allow per capita, hide the per capita
        // input.
        const hidePcInputs =
          chartSvInfo.filter((sv) => !sv.info.pcAllowed).length > 0;
        const chartPCInputs = hidePcInputs
          ? []
          : [
              {
                isChecked: chartSvInfo[0].isPerCapita,
                onUpdated: (isChecked: boolean): void => {
                  const newStatVars = _.cloneDeep(appContext.statVars);
                  appContext.statVars.forEach((sv, idx) => {
                    if (chartSvs.has(sv.dcid)) {
                      newStatVars[idx].isPerCapita = isChecked;
                    }
                  });
                  appContext.setStatVars(newStatVars);
                },
                label: "Per Capita",
                gaEventParam: GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
              },
            ];
        return (
          <div className="chart timeline" key={chartId}>
            {getSvChips(chartSvInfo, appContext)}
            <LineTile
              comparisonPlaces={appContext.places.map((place) => place.dcid)}
              id={`vis-tool-timeline-${chartId}`}
              title=""
              statVarSpec={chartSvSpecs}
              svgChartHeight={chartHeight}
              place={appContext.places[0]}
              colors={COLORS}
              showTooltipOnHover={true}
            />
            <ChartFooter
              inputSections={[{ inputs: chartPCInputs }]}
              facetSelector={getFacetSelector(appContext, chartSvInfo)}
            />
          </div>
        );
      })}
    </>
  );
}

function getInfoContent(): JSX.Element {
  const hideExamples = _.isEmpty(window.infoConfig["timeline"]);
  return (
    <div className="info-content">
      <div>
        <h3>Timeline</h3>
        <p>
          The timeline tool helps you explore trends for statistical variables.
        </p>
      </div>
      {!hideExamples && (
        <div>
          <p>
            You can start your exploration from one of these interesting points
            ...
          </p>
          <MemoizedInfoExamples configKey="timeline" />
        </div>
      )}

      <p>
        {hideExamples ? "Click" : "Or click"} start to build your own timelines.
      </p>
    </div>
  );
}

export const TIMELINE_CONFIG = {
  displayName: "Timeline",
  svHierarchyType: StatVarHierarchyType.TIMELINE,
  skipEnclosedPlaceType: true,
  getChartArea,
  getInfoContent,
  oldToolUrl: "/tools/timeline",
};
