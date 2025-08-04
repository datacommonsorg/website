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
 * Renders either the Rich or Simple facet selector component based on a
 * feature flag. This component acts as a switchboard.
 */

/* TODO (nick-next): When the feature flag is to be removed, remove this
   component and rename FacetSelectorRich to FacetSelector
 */

import React, { ReactElement } from "react";

import { isFeatureEnabled, METADATA_FEATURE_FLAG } from "../feature_flags/util";
import { StatMetadata } from "../stat_types";
import { FacetSelectorRich } from "./facet_selector_rich";
import { FacetSelectorSimple } from "./facet_selector_simple";

export interface FacetSelectorFacetInfo {
  // dcid of the stat var
  dcid: string;
  // name of the stat var
  name: string;
  // mapping of facet id to corresponding metadata for available facets for
  // this stat var
  metadataMap: Record<string, StatMetadata>;
  // mapping of facet id to the display name to use for the corresponding facet
  displayNames?: Record<string, string>;
}

interface FacetSelectorPropType {
  // the variant with small used for the old tools, inline as an inline
  // text button and standard elsewhere
  variant?: "standard" | "small" | "inline";
  // the mode of the facet selector determines the copy used in the instructions
  mode?: "chart" | "download";
  // Map of sv to selected facet id
  svFacetId: Record<string, string>;
  // The list of available facets for each stat var
  facetList: FacetSelectorFacetInfo[] | null;
  // Whether the facet information is currently being loaded
  loading: boolean;
  // An error message to display if the fetch fails
  error: boolean;
  // Callback function that is run when new facets are selected
  onSvFacetIdUpdated: (
    svFacetId: Record<string, string>,
    metadataMap: Record<string, StatMetadata>
  ) => void;
  // If set, when a facet is selected for one stat var, the corresponding
  // facet is selected for all other stat vars. This only applies if all
  // stat vars have the same facet choices.
  allowSelectionGrouping?: boolean;
}

export function FacetSelector(props: FacetSelectorPropType): ReactElement {
  const useRichSelector = isFeatureEnabled(METADATA_FEATURE_FLAG);

  if (useRichSelector) {
    return <FacetSelectorRich {...props} />;
  }
  return <FacetSelectorSimple {...props} />;
}
