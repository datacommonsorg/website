import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { FacetMetadata } from "../../types/facet_metadata";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { trimCategory } from "../../utils/subject_page_utils";

/**
 * Component to show the Subject Page for the highlight only.
 */

const PAGE_ID = "highlight-result";

interface HighlightResultProps {
  highlightPageMetadata: SubjectPageMetadata;
  maxBlock: number;
  highlightFacet?: FacetMetadata;
}

export function HighlightResult(
  props: HighlightResultProps
): React.ReactElement {
  return (
    <div>
      <p>Looking for {props.highlightFacet?.importName}</p>
      <SubjectPageMainPane
        id={PAGE_ID}
        place={props.highlightPageMetadata.place}
        pageConfig={trimCategory(
          props.highlightPageMetadata.pageConfig,
          props.maxBlock
        )}
        showExploreMore={false}
        highlightFacet={props.highlightFacet}
      />
    </div>
  );
}
