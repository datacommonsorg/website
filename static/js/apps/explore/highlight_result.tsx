import React from "react";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { StatMetadata } from "../../shared/stat_types";
import { NamedNode, StatVarFacetMap } from "../../shared/types";
import { StatVarMetadata } from "../../tools/shared/metadata/metadata";
import { fetchMetadata } from "../../tools/shared/metadata/metadata_fetcher";
import { TileMetadataModalContent } from "../../tools/shared/metadata/tile_metadata_modal_content";
import { FacetMetadata } from "../../types/facet_metadata";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { getFacets } from "../../utils/data_fetch_utils";
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
  const statMetadataRecord: { [key: string]: StatMetadata } = {
    "1": {
      provenanceUrl: props.highlightFacet?.importName || "",
      measurementMethod: props.highlightFacet?.measurementMethod || "",
      observationPeriod: props.highlightFacet?.observationPeriod || "",
      scalingFactor: "",
      unit: props.highlightFacet?.unit || "",
    },
  };

  const statVarArray = Array.from(statVarSet);
  const facets = await getFacets(
    props.apiRoot,
    [props.highlightPageMetadata.place.dcid],
    statVarArray
  );
  console.log("facets", facets);

  const facetIds = new Set<string>();
  facetIds.add("10983471");
  const statVarFacetMap: StatVarFacetMap = {
    Count_Person: facetIds,
  };

  // const svSet = new Set<string>();
  // svSet.add(svthing);
  console.log("statVarSet", statVarSet);
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
      const { metadata, statVarList } = await doMetadataFetch(props);
      setMetadataMap(metadata);
      setStatVarList(statVarList);
      console.log("metadataMap", metadata);
    };
    fetchData();
  }, [props]);

  const optionDan = false;
  const optionAdriana = true;

  React.useEffect(() => {
    setPageConfig(props.highlightPageMetadata.pageConfig);
  }, []);

  React.useEffect(() => {
    if (pageConfig && optionDan) {
      const met =
        metadataMap && metadataMap["Count_Person"]
          ? metadataMap["Count_Person"][0]
          : null;
      const desc = met?.sourceName + ", with minor processing by Data Commons";
      pageConfig.categories[0].blocks[0].description = desc;
      setPageConfig(JSON.parse(JSON.stringify(pageConfig)));
    }
  }, [metadataMap]);

  return (
    <div>
      {optionAdriana && (
        <div>
          <br></br>
          <TileMetadataModalContent
            statVars={statVarList}
            metadataMap={metadataMap}
            apiRoot={props.apiRoot}
          />
        </div>
      )}
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
