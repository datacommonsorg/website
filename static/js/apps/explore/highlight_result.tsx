import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { trimCategory } from "../../utils/subject_page_utils";

/**
 * Component to show the Subject Page for the highlight only.
 */

const PAGE_ID = "highlight-result";

interface HighlightResultProps {
  highlightPageMetadata: SubjectPageMetadata;
  maxBlock: number;
}

const HighlightResult: React.FC<HighlightResultProps> = (
  props: HighlightResultProps
) => {
  return (
    <div>
      <SubjectPageMainPane
        id={PAGE_ID}
        place={props.highlightPageMetadata.place}
        pageConfig={trimCategory(
          props.highlightPageMetadata.pageConfig,
          props.maxBlock
        )}
        showExploreMore={false}
      />
    </div>
  );
};

export default HighlightResult;
