/**
 * Copyright 2022 Google LLC
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
 * Footer for charts created by the different tools
 */

import React, { ReactElement } from "react";

import {
  FacetSelector,
  FacetSelectorFacetInfo,
} from "../../../shared/facet_selector";
import {
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_PARAM_TOOL_CHART_OPTION,
  GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES,
  triggerGAEvent,
} from "../../../shared/ga_events";

interface ToolChartHeaderProps {
  // Map of stat var to facet id of the selected source for that variable.
  svFacetId: Record<string, string>;
  // Source selector information for a list of stat vars.
  facetList: FacetSelectorFacetInfo[];
  // callback when mapping of stat var dcid to facet id is updated.
  onSvFacetIdUpdated: (svFacetId: Record<string, string>) => void;
}

export function ToolChartHeader(props: ToolChartHeaderProps): ReactElement {
  return (
    <div>
      <FacetSelector
        svFacetId={props.svFacetId}
        facetListPromise={Promise.resolve(props.facetList)}
        onSvFacetIdUpdated={(svFacetId): void => {
          props.onSvFacetIdUpdated(svFacetId);
          triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
            [GA_PARAM_TOOL_CHART_OPTION]:
              GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES,
          });
        }}
      />
    </div>
  );
}
