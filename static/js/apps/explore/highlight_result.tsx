import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { NamedNode, StatVarFacetMap } from "../../shared/types";
import {
  buildCitationParts,
  CitationPart,
} from "../../tools/shared/metadata/citations";
import { StatVarMetadata } from "../../tools/shared/metadata/metadata";
import { fetchMetadata } from "../../tools/shared/metadata/metadata_fetcher";
import { FacetMetadata } from "../../types/facet_metadata";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { FacetResponse, getFacets } from "../../utils/data_fetch_utils";
import { trimCategory } from "../../utils/subject_page_utils";

/**
 * Component to show the Subject Page for the highlight only.
 */

const PAGE_ID = "highlight-result";

interface HighlightResultProps {
  highlightPageMetadata: SubjectPageMetadata;
  maxBlock: number;
  highlightFacet?: FacetMetadata;
  apiRoot?: string;
}

async function doMetadataFetch(props: HighlightResultProps): Promise<{
  metadata: Record<string, StatVarMetadata[]>;
  statVarList: NamedNode[];
}> {
  const statVarSet = new Set<string>();
  if (props.highlightPageMetadata.pageConfig.categories[0].statVarSpec) {
    for (const spec of Object.values(
      props.highlightPageMetadata.pageConfig.categories[0].statVarSpec
    )) {
      statVarSet.add(spec.statVar);
      if (spec.denom) {
        statVarSet.add(spec.denom);
      }
    }
  }

  const dataCommonsClient = getDataCommonsClient(props.apiRoot);

  const statVarArray = Array.from(statVarSet);
  const facets: FacetResponse = await getFacets(
    props.apiRoot,
    [props.highlightPageMetadata.place.dcid],
    statVarArray
  );

  console.log("facets", JSON.stringify(facets));
  // console.log("HighlightFacet", JSON.stringify(props.highlightFacet));
  const statVarFacetMap: StatVarFacetMap = {};
  for (const statVar in facets) {
    // if props.highlightFacet is not null, match the right facet then add it to statVarFacetMap
    // for (const facet of facets[statVar]) {
    const facet = facets[statVar];
    console.log("Facet is ", facet);
    for (const facetId in facet) {
      if (facet[facetId].importName === props.highlightFacet?.importName) {
        console.log(`Found matching facet for ${statVar}: ${facet.importName}`);
        statVarFacetMap[statVar] = new Set([facetId]);
        break;
      }
    }
  }

  return fetchMetadata(
    statVarSet,
    facets["Count_Person"],
    dataCommonsClient,
    statVarFacetMap,
    props.apiRoot
  );
}

export function HighlightResult(
  props: HighlightResultProps
): React.ReactElement {
  const [metadataMap, setMetadataMap] = React.useState<
    Record<string, StatVarMetadata[]>
  >({});
  const [statVarList, setStatVarList] = React.useState<NamedNode[]>([]);
  const [pageConfig, setPageConfig] = React.useState(
    props.highlightPageMetadata.pageConfig
  );

  React.useEffect(() => {
    const fetchData = async (): Promise<void> => {
      doMetadataFetch(props).then(({ metadata, statVarList }) => {
        setMetadataMap(metadata);
        setStatVarList(statVarList);
      });
    };
    fetchData();

    setPageConfig(props.highlightPageMetadata.pageConfig);
  }, [props]);

  const generateCitationSources = (citationParts: CitationPart[]): string[] => {
    return citationParts.map(({ label }) => label);
  };

  React.useEffect(() => {
    if (
      !pageConfig ||
      pageConfig.categories.length === 0 ||
      pageConfig.categories[0].blocks.length === 0
    ) {
      return;
    }

    const pageConfigCopy = structuredClone(
      props.highlightPageMetadata.pageConfig
    );

    const highlightChartDescription = generateCitationSources(
      buildCitationParts(statVarList, metadataMap, true)
    ).join(", ");

    pageConfigCopy.categories[0].blocks[0].description =
      highlightChartDescription;
    setPageConfig(pageConfigCopy);
  }, [statVarList, metadataMap]);

  return (
    <div>
      <SubjectPageMainPane
        id={PAGE_ID}
        place={props.highlightPageMetadata.place}
        pageConfig={trimCategory(pageConfig, props.maxBlock)}
        showExploreMore={false}
        highlightFacet={props.highlightFacet}
      />
    </div>
  );
}
