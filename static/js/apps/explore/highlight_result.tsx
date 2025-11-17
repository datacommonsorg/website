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
 * Component to show the Subject Page for the highlight only.
 */

import React, { ReactElement, useMemo } from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { FacetSelectionCriteria } from "../../types/facet_selection_criteria";
import { SubjectPageConfig } from "../../types/subject_page_proto_types";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { trimCategory } from "../../utils/subject_page_utils";

const PAGE_ID = "highlight-result";

interface HighlightResultProps {
  highlightPageMetadata: SubjectPageMetadata;
  maxBlock: number;
  facetSelector?: FacetSelectionCriteria;
  apiRoot?: string;
}

/**
 * Component to render the highlight result section of the page.
 *
 * This component fetches metadata and statistical variable information,
 * processes the page configuration, and renders the main pane with the
 * processed data.
 *
 * @param props - The properties for the HighlightResult component.
 * @param props.highlightPageMetadata - Metadata for the highlight page, including
 * the page configuration and place information.
 * @param props.maxBlock - The maximum number of blocks to display in the trimmed
 * category configuration.
 * @param props.facetSelector - The selection criteria for the facet to highlight in the rendered page.
 *
 * @returns A React element rendering the highlight result section.
 */
export function HighlightResult(props: HighlightResultProps): ReactElement {
  const pageConfig = useMemo(() => {
    // Process the page config and set metadata summary for each block when loaded
    return structuredClone(
      props.highlightPageMetadata.pageConfig
    ) as SubjectPageConfig;
  }, [props.highlightPageMetadata.pageConfig]);

  return (
    <div className="highlight-result-title">
      <SubjectPageMainPane
        id={PAGE_ID}
        place={props.highlightPageMetadata.place}
        pageConfig={trimCategory(pageConfig, props.maxBlock)}
        showExploreMore={false}
        facetSelector={props.facetSelector}
      />
    </div>
  );
}
