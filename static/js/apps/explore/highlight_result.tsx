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

export function HighlightResult(
  props: HighlightResultProps
): React.ReactElement {
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);

  const statMetadataRecord: { [key: string]: StatMetadata } = {
    Count_Person: {
      provenanceUrl: props.highlightFacet?.importName || "",
      measurementMethod: props.highlightFacet?.measurementMethod || "",
      observationPeriod: props.highlightFacet?.observationPeriod || "",
      scalingFactor: String(props.highlightFacet?.scalingFactor) || "",
      unit: props.highlightFacet?.unit || "",
    },
  };

  console.log("StatMetadata Record: ", statMetadataRecord);
  console.log(props.highlightPageMetadata);

  const svthing =
    props.highlightPageMetadata.pageConfig.categories[0].statVarSpec[
      "Count_Person2"
    ].statVar;
  console.log("Stat var thing: ", svthing);
  const statVarFacetMap: StatVarFacetMap = {
    [svthing]: new Set(["1"]),
  };

  const [metadataMap, setMetadataMap] = React.useState<
    Record<string, StatVarMetadata[]>
  >({});
  const [statVarList, setStatVarList] = React.useState<NamedNode[]>([]);

  React.useEffect(() => {
    fetchMetadata(
      new Set(svthing),
      statMetadataRecord,
      dataCommonsClient,
      statVarFacetMap,
      props.apiRoot
    )
      .then((response) => {
        const { metadata, statVarList } = response;
        setMetadataMap(metadata);
        setStatVarList(statVarList);
        console.log("Fetched metadata: ", metadata);
        console.log("Fetched stat var list: ", statVarList);
      })
      .catch((error) => {
        console.error("Error fetching metadata: ", error);
      });
  }, [props.highlightPageMetadata]);

  // Extract Stat Var information, place information, source information.
  // const svSource = props.highlightPageMetadata.svSource;
  // console.log("SV SOURCE IS " + JSON.stringify(svSource));

  // const places = props.highlightPageMetadata.places;
  // console.log("PLACES ARE " + JSON.stringify(places));

  // const facet = props.highlightFacet;
  // console.log("Requested facet is " + JSON.stringify(facet));
  return (
    <div>
      <br></br>
      <div id="place-callout">
        <span>Highlighted Chart</span>
      </div>
      <TileMetadataModalContent
        statVars={statVarList}
        metadataMap={metadataMap}
        apiRoot={props.apiRoot}
      />
      <p>
        This is the data that is being highlighted as requested. It comes frmo
        the source X - [Add Provenance name and description] with minor
        processing from datacommons.
      </p>
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
