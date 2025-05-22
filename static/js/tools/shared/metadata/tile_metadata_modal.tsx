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
 * Displays a modal with comprehensive metadata for a particular chart.
 *
 * The modal displays each stat var used in the chart, and for each
 * stat var, relevant information about the provenance/source used by
 * that stat var.
 *
 * At the bottom of the modal, we display a combined citation section.
 */

import React, { ReactElement, useEffect, useMemo, useState } from "react";

import { Button } from "../../../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/dialog";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { StatMetadata } from "../../../shared/stat_types";
import { NamedNode, StatVarFacetMap, StatVarSpec } from "../../../shared/types";
import { getDataCommonsClient } from "../../../utils/data_commons_client";
import { buildCitationParts, citationToPlainText } from "./citations";
import { CopyCitationButton } from "./copy_citation_button";
import {
  Provenance,
  StatVarMetadata,
  StatVarProvenanceSummaries,
} from "./metadata";
import { TileMetadataModalContent } from "./tile_metadata_modal_content";

interface TileMetadataModalPropType {
  // A full set of the facets used within the chart
  facets: Record<string, StatMetadata>;
  // A mapping of which stat var used which facets
  statVarToFacets?: StatVarFacetMap;
  // the stat vars used in the chart
  statVarSpecs: StatVarSpec[];
  containerRef?: React.RefObject<HTMLElement>;
  // root URL used to generate stat var explorer and license links
  apiRoot?: string;
}

export function TileMetadataModal(
  props: TileMetadataModalPropType
): ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statVars, setStatVars] = useState<NamedNode[]>([]);
  const [metadataMap, setMetadataMap] = useState<
    Record<string, StatVarMetadata[]>
  >({});
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);

  const statVarSet = useMemo(() => {
    const result = new Set<string>();
    if (props.statVarSpecs) {
      for (const spec of props.statVarSpecs) {
        result.add(spec.statVar);
        if (spec.denom) {
          result.add(spec.denom);
        }
      }
    }
    return result;
  }, [props.statVarSpecs]);

  useEffect(() => {
    if (!modalOpen) return;
    if (statVarSet.size === statVars.length) return;

    setLoading(true);

    const fetchMetadata = async (): Promise<void> => {
      try {
        const statVars = [...statVarSet];
        if (statVars.length === 0) {
          return;
        }

        /*
         1. We retrieve the full stat var names from the DCIDs
         */
        const responseObj = await dataCommonsClient.getFirstNodeValues({
          dcids: statVars,
          prop: "name",
        });
        const statVarList: NamedNode[] = [];
        for (const dcid in responseObj) {
          statVarList.push({ dcid, name: responseObj[dcid] });
        }
        statVarList.sort((a, b) => (a.name > b.name ? 1 : -1));
        setStatVars(statVarList);

        /*
        2.  We get the stat var categories (e.g., "Demographics").
            This is a two-step process: first we look up the path to the variable
            group. We then look up the group itself to get the "absoluteName", which
            is the readable name of the category.
         */

        // 1 a. get the category paths
        const categoryPathPromises = statVars.map((statVarId) =>
          fetch(
            `${props.apiRoot || ""}/api/variable/path?dcid=${statVarId}`
          ).then((response) => response.json())
        );
        const categoryPathResults = await Promise.all(categoryPathPromises);

        const categoryPaths = new Set<string>();
        statVars.forEach((_, index) => {
          const categories: string[] =
            categoryPathResults[index]?.slice(1) ?? [];
          const lastDcid = categories[categories.length - 1];
          if (lastDcid) categoryPaths.add(lastDcid);
        });

        // 1 b. from those paths, get the absolute names
        const categoryInfoMap: Record<string, string> = {};
        const categoryPromises = Array.from(categoryPaths).map(
          async (categoryPath) => {
            const response = await fetch(
              `${props.apiRoot || ""}/api/variable-group/info`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  dcid: categoryPath,
                  entities: [],
                  numEntitiesExistence: 0,
                }),
              }
            );
            const data = await response.json();
            categoryInfoMap[categoryPath] =
              data.absoluteName || categoryPath.split("/").pop();
          }
        );
        await Promise.all(categoryPromises);

        const statVarCategoryMap: Record<string, string[]> = {};
        statVars.forEach((statVarId, index) => {
          const categories: string[] =
            categoryPathResults[index]?.slice(1) ?? [];
          const lastDcid = categories[categories.length - 1];
          const topic = lastDcid && categoryInfoMap[lastDcid];
          statVarCategoryMap[statVarId] = topic ? [topic] : [];
        });

        /*
          3.  We now pull the full stat var information for each stat var. The
              results contain a lookup for each stat var of the sources, and under
              that, information we need about the stat var-source combo
         */
        const dcidsParam = statVars.map((id) => `dcids=${id}`).join("&");
        const variableResponse = await fetch(
          `${props.apiRoot || ""}/api/variable/info?${dcidsParam}`
        );
        const variableData: Record<string, StatVarProvenanceSummaries> =
          await variableResponse.json();

        const provenances = new Set<string>();
        const measurementMethods = new Set<string>();

        statVars.forEach((statVarId) => {
          const facetIdSet =
            props.statVarToFacets?.[statVarId] || new Set<string>();

          facetIdSet.forEach((facetId) => {
            const facetInfo = props.facets[facetId];

            if (facetInfo?.importName) {
              const provenanceFullPath = `dc/base/${facetInfo.importName}`;
              provenances.add(provenanceFullPath);

              const summary =
                variableData[statVarId]?.provenanceSummary?.[provenanceFullPath]
                  ?.seriesSummary;
              const measurementMethod =
                summary?.[0]?.seriesKey?.measurementMethod;
              if (measurementMethod) measurementMethods.add(measurementMethod);
            }
          });
        });

        /*
          4.  We now look up the base information about each source (provenance).
              This gives us some of the core information we need about the source itself.
         */
        const provenanceMap: Record<string, Provenance> = {};
        const provenancePromises = Array.from(provenances).map((provenanceId) =>
          fetch(`${props.apiRoot || ""}/api/node/triples/out/${provenanceId}`)
            .then((response) => response.json())
            .then((data) => {
              provenanceMap[provenanceId] = data;
            })
        );
        await Promise.all(provenancePromises);

        /*
          5.  We now look up some attributes of required fields for which we have only the dcid.
              Currently, this is the description of the measurement method.
         */
        let measurementMethodMap: Record<string, string> = {};
        if (measurementMethods.size) {
          measurementMethodMap = await dataCommonsClient.getFirstNodeValues({
            dcids: Array.from(measurementMethods),
            prop: "description",
          });
        }

        const metadata: Record<string, StatVarMetadata[]> = {};

        /*
          With all the data collected together above, we collate it into a final
          data structure that we send into the metadata content for actual display.
         */
        for (const statVarId of statVars) {
          const facetIdSet =
            props.statVarToFacets?.[statVarId] || new Set<string>();
          metadata[statVarId] = [];

          for (const facetId of facetIdSet) {
            const facetInfo = props.facets[facetId];

            if (!facetInfo?.importName) continue;

            const importName = facetInfo.importName;
            const provenanceId = `dc/base/${importName}`;
            const provenanceData = provenanceMap[provenanceId];

            if (!provenanceData) continue;

            let unit: string | undefined;
            let releaseFrequency: string | undefined;
            let observationPeriod: string | undefined;
            let dateRangeStart: string | undefined;
            let dateRangeEnd: string | undefined;
            let measurementMethod: string | undefined;
            let measurementMethodDescription: string | undefined;

            if (variableData[statVarId]?.provenanceSummary) {
              const source =
                variableData[statVarId].provenanceSummary?.[provenanceId];
              if (source) {
                releaseFrequency = source.releaseFrequency;
                /*
                  We look up the series key that matches the attributes
                  associated with the facets.
                 */
                const matchedSeries = source.seriesSummary?.find((series) => {
                  const key = series.seriesKey ?? {};
                  return (
                    (facetInfo.measurementMethod == null ||
                      key.measurementMethod === facetInfo.measurementMethod) &&
                    (facetInfo.observationPeriod == null ||
                      key.observationPeriod === facetInfo.observationPeriod) &&
                    (facetInfo.unit == null || key.unit === facetInfo.unit) &&
                    (facetInfo.scalingFactor == null ||
                      key.scalingFactor === facetInfo.scalingFactor)
                  );
                });

                if (matchedSeries) {
                  dateRangeStart = matchedSeries.earliestDate;
                  dateRangeEnd = matchedSeries.latestDate;

                  const key = matchedSeries.seriesKey ?? {};
                  unit = key.unit;
                  observationPeriod = key.observationPeriod;
                  measurementMethod = key.measurementMethod;

                  if (measurementMethod) {
                    measurementMethodDescription =
                      measurementMethodMap[measurementMethod] ||
                      measurementMethod;
                  }
                }
              }
            }

            metadata[statVarId].push({
              statVarId,
              statVarName: responseObj[statVarId] || statVarId,
              categories: statVarCategoryMap[statVarId],
              sourceName: provenanceData?.source?.[0]?.name,
              provenanceUrl: provenanceData?.url?.[0]?.value,
              provenanceName:
                provenanceData?.isPartOf?.[0]?.name ||
                provenanceData?.name?.[0]?.value ||
                importName,
              dateRangeStart,
              dateRangeEnd,
              unit,
              observationPeriod,
              periodicity: releaseFrequency,
              license: provenanceData?.licenseType?.[0]?.name,
              licenseDcid: provenanceData?.licenseType?.[0]?.dcid,
              measurementMethod,
              measurementMethodDescription,
            });
          }
        }

        setMetadataMap(metadata);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };

    fetchMetadata().finally(() => setLoading(false));
  }, [
    modalOpen,
    statVarSet,
    statVars.length,
    dataCommonsClient,
    props.apiRoot,
    props.statVarToFacets,
    props.facets,
  ]);

  useEffect(() => {
    setStatVars([]);
  }, [props.facets, props.statVarToFacets]);

  const citationParts = useMemo(
    () => buildCitationParts(statVars, metadataMap),
    [statVars, metadataMap]
  );
  const citationText = useMemo(
    () => citationToPlainText(citationParts),
    [citationParts]
  );

  return (
    <>
      <a
        href="#"
        onClick={(e): void => {
          e.preventDefault();
          setModalOpen(true);
        }}
      >
        {intl.formatMessage(messages.showMetadata)}
      </a>
      <Dialog
        containerRef={props.containerRef}
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        loading={loading}
      >
        <DialogTitle>{intl.formatMessage(messages.metadata)}</DialogTitle>
        <DialogContent>
          {!loading && (
            <TileMetadataModalContent
              statVars={statVars}
              metadataMap={metadataMap}
              apiRoot={props.apiRoot}
            />
          )}
        </DialogContent>
        <DialogActions>
          <CopyCitationButton citationToCopy={citationText}>
            {intl.formatMessage(metadataComponentMessages.CopyCitation)}
          </CopyCitationButton>
          <Button
            variant="text"
            onClick={(): void => {
              setModalOpen(false);
            }}
          >
            {intl.formatMessage(messages.close)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
