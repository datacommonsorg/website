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
 * Config for the scatter vis type.
 */

import _ from "lodash";
import React, { ReactElement, useCallback, useMemo } from "react";

import { ScatterTile } from "../../../components/tiles/scatter_tile";
import { FacetSelector } from "../../../shared/facet_selector/facet_selector";
import {
  GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
  GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
  GA_VALUE_TOOL_CHART_OPTION_SHOW_LABELS,
  GA_VALUE_TOOL_CHART_OPTION_SHOW_QUADRANTS,
} from "../../../shared/ga_events";
import { usePromiseResolver } from "../../../shared/hooks/promise_resolver";
import { StatVarHierarchyType } from "../../../shared/types";
import { fetchFacetChoicesWithin } from "../../../tools/shared/facet_choice_fetcher";
import { MemoizedInfoExamples } from "../../../tools/shared/info_examples";
import { getStatVarSpec } from "../../../utils/app/visualization_utils";
import { AppContextType } from "../app_context";
import { ChartHeader, InputInfo } from "../chart_header";
import { VisType } from "../vis_type_configs";

function getAxisInputs(
  svIdx: number,
  appContext: AppContextType,
  hidePc?: boolean
): InputInfo[] {
  if (svIdx > appContext.statVars.length) {
    return [];
  }
  const inputs = [];
  const sv = appContext.statVars[svIdx];
  if (!hidePc) {
    inputs.push({
      isChecked: sv.isPerCapita,
      onUpdated: (isChecked: boolean) => {
        const newStatVars = _.cloneDeep(appContext.statVars);
        newStatVars[svIdx].isPerCapita = isChecked;
        appContext.setStatVars(newStatVars);
      },
      label: "Per Capita",
      gaEventParam: GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
    });
  }
  inputs.push({
    isChecked: sv.isLog,
    onUpdated: (isChecked: boolean) => {
      const newStatVars = _.cloneDeep(appContext.statVars);
      newStatVars[svIdx].isLog = isChecked;
      appContext.setStatVars(newStatVars);
    },
    label: "Log Scale",
    gaEventParam: GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
  });
  return inputs;
}

function getDisplayInputs(appContext: AppContextType): InputInfo[] {
  return [
    {
      isChecked: appContext.displayOptions.scatterQuadrants,
      onUpdated: (isChecked: boolean): void => {
        const newDisplayOptions = _.cloneDeep(appContext.displayOptions);
        newDisplayOptions.scatterQuadrants = isChecked;
        appContext.setDisplayOptions(newDisplayOptions);
      },
      label: "Show quadrants",
      gaEventParam: GA_VALUE_TOOL_CHART_OPTION_SHOW_QUADRANTS,
    },
    {
      isChecked: appContext.displayOptions.scatterPlaceLabels,
      onUpdated: (isChecked: boolean): void => {
        const newDisplayOptions = _.cloneDeep(appContext.displayOptions);
        newDisplayOptions.scatterPlaceLabels = isChecked;
        appContext.setDisplayOptions(newDisplayOptions);
      },
      label: "Show labels",
      gaEventParam: GA_VALUE_TOOL_CHART_OPTION_SHOW_LABELS,
    },
  ];
}

interface ChartFacetSelectorProps {
  appContext: AppContextType;
  surfaceHeaderValue: string;
}

function ChartFacetSelector({
  appContext,
  surfaceHeaderValue,
}: ChartFacetSelectorProps): ReactElement {
  const statVars = useMemo(
    () => appContext.statVars.slice(0, 2),
    [appContext.statVars]
  );

  const svFacetId = {};
  statVars.forEach((sv) => {
    svFacetId[sv.dcid] = sv.facetId;
  });

  const fetchFacets = useCallback(async () => {
    return fetchFacetChoicesWithin(
      appContext.places[0].dcid,
      appContext.enclosedPlaceType,
      statVars.map((sv) => ({
        dcid: sv.dcid,
        name: sv.info.title,
        date: sv.date,
      })),
      surfaceHeaderValue
    );
  }, [appContext.places, appContext.enclosedPlaceType, statVars]);

  const { data: facetList, loading, error } = usePromiseResolver(fetchFacets);

  const onSvFacetIdUpdated = (svFacetId: Record<string, string>): void => {
    const facetsChanged = statVars.filter(
      (sv) => sv.facetId !== svFacetId[sv.dcid]
    );
    if (_.isEmpty(facetsChanged)) {
      return;
    }
    const newStatVars = _.cloneDeep(appContext.statVars);
    statVars.forEach((sv, idx) => {
      newStatVars[idx].facetId = svFacetId[sv.dcid];
    });
    appContext.setStatVars(newStatVars);
  };

  return (
    <FacetSelector
      svFacetId={svFacetId}
      facetList={facetList}
      loading={loading}
      error={!!error}
      onSvFacetIdUpdated={onSvFacetIdUpdated}
    />
  );
}

function getChartArea(
  appContext: AppContextType,
  chartHeight: number,
  surfaceHeaderValue: string
): ReactElement {
  // If any svs do not allow per capita, hide the per capita inputs.
  const hidePcInputs =
    appContext.statVars.filter((sv) => !sv.info.pcAllowed).length > 0;
  const statVarLabels = appContext.statVars.map(
    (sv) => sv.info.title || sv.dcid
  );
  return (
    <div className="chart scatter">
      <ChartHeader
        inputSections={[
          {
            label: "Y-axis:",
            inputs: getAxisInputs(0, appContext, hidePcInputs),
          },
          {
            label: "X-axis:",
            inputs: getAxisInputs(1, appContext, hidePcInputs),
          },
          { label: "Display:", inputs: getDisplayInputs(appContext) },
        ]}
        facetSelector={
          <ChartFacetSelector
            appContext={appContext}
            surfaceHeaderValue={surfaceHeaderValue}
          />
        }
      />
      <ScatterTile
        id="vis-tool-scatter"
        title={
          statVarLabels[0] +
          " (${yDate}) vs " +
          statVarLabels[1] +
          " (${xDate})"
        }
        place={appContext.places[0]}
        enclosedPlaceType={appContext.enclosedPlaceType}
        statVarSpec={appContext.statVars.map((sv) =>
          getStatVarSpec(sv, VisType.SCATTER)
        )}
        svgChartHeight={chartHeight}
        scatterTileSpec={{
          showPlaceLabels: appContext.displayOptions.scatterPlaceLabels,
          showQuadrants: appContext.displayOptions.scatterQuadrants,
        }}
        surfaceHeaderValue={surfaceHeaderValue}
      />
    </div>
  );
}

function getInfoContent(): ReactElement {
  const hideExamples = _.isEmpty(window.infoConfig["scatter"]);
  return (
    <div className="info-content">
      <div>
        <h3>Scatter Plot</h3>
        <p>
          The scatter plot tool helps you visualize the correlation between two
          statistical variables.
        </p>
      </div>
      {!hideExamples && (
        <div>
          <p>
            You can start your exploration from one of these interesting points
            ...
          </p>
          <MemoizedInfoExamples configKey="scatter" />
        </div>
      )}
      <p>
        {hideExamples ? "Click" : "Or click"} start to build your own scatter
        plot.
      </p>
    </div>
  );
}

export const SCATTER_CONFIG = {
  displayName: "Scatter Plot",
  svHierarchyType: StatVarHierarchyType.SCATTER,
  svHierarchyNumExistence: globalThis.minStatVarGeoCoverage,
  singlePlace: true,
  numSv: 2,
  getChartArea,
  getInfoContent,
  oldToolUrl: "/tools/scatter",
};
