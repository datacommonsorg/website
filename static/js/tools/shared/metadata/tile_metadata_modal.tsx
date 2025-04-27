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
 * At the bottom of the chart, we display a combined citation section.
 */

import React, { ReactElement, useEffect, useMemo, useState } from "react";

import { humanizeIsoDuration } from "../../../apps/base/utilities/utilities";
import { Button } from "../../../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../../components/elements/dialog/dialog";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { StatMetadata } from "../../../shared/stat_types";
import { StatVarSpec } from "../../../shared/types";
import { getDataCommonsClient } from "../../../utils/data_commons_client";
import { apiRootToHostname } from "../../../utils/url_utils";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";

interface TileMetadataModalPropType {
  // A full set of the facets used within the chart
  facets: Record<string, StatMetadata>;
  // A mapping of which stat var used which facet
  statVarToFacet?: Record<string, string>;
  // the stat vars used in the chart
  statVarSpecs: StatVarSpec[];
  containerRef?: React.RefObject<HTMLElement>;
  apiRoot?: string;
}

// [dcid, name]
type DcidNameTuple = [string, string];

// Metadata associated with a stat var and provenance/source combination.
interface StatVarMetadata {
  statVarId: string; // DCID of the stat var
  statVarName: string; // Label of the stat var
  category?: string; // Category name of the stat var (e.g., "Demographics")
  sourceName?: string; // Source name
  provenanceUrl?: string; // Provenance source URL
  provenanceName?: string; // Provenance source name
  dateRangeStart?: string; // Start date
  dateRangeEnd?: string; // End date
  unit?: string; // Unit (e.g., "Years")
  observationPeriod?: string; // ISO 8601 duration string (e.g., "P1Y")
  license?: string; // License type
  licenseDcid?: string; // The DCID for the license (for linking)
}

export function TileMetadataModal(
  props: TileMetadataModalPropType
): ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statVarNames, setStatVarNames] = useState<DcidNameTuple[]>([]);
  const [metadataMap, setMetadataMap] = useState<
    Record<string, StatVarMetadata>
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
    if (statVarSet.size === statVarNames.length) return;

    setLoading(true);

    const fetchMetadata = async (): Promise<void> => {
      try {
        const statVars = [...statVarSet];
        if (statVars.length === 0) {
          return;
        }

        // Get stat var names from the DCIDs
        const responseObj = await dataCommonsClient.getFirstNodeValues({
          dcids: statVars,
          prop: "name",
        });
        const statVarList: DcidNameTuple[] = [];
        for (const dcid in responseObj) {
          statVarList.push([dcid, responseObj[dcid]]);
        }
        statVarList.sort((a, b) => (a[1] > b[1] ? 1 : -1));
        setStatVarNames(statVarList);

        // Get stat var categories. This is a two-step process: first we
        // look up the path to the variable group. Then we look up the group
        // itself to get the "absoluteName" (the readable name of the category).

        // Step 1: get the category paths
        const categoryPathPromises = statVars.map((statVarId) =>
          fetch(
            `${props.apiRoot || ""}/api/variable/path?dcid=${statVarId}`
          ).then((response) => response.json())
        );
        const categoryPathResults = await Promise.all(categoryPathPromises);

        const categoryPaths = new Set<string>();
        statVars.forEach((_, index) => {
          const categoryPath = categoryPathResults[index][1];
          if (categoryPath) {
            categoryPaths.add(categoryPath);
          }
        });

        // Step 2: from those paths, get the absolute names
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

        const statVarCategoryMap: Record<string, string> = {};
        statVars.forEach((statVarId, index) => {
          const categoryPath = categoryPathResults[index][1];
          if (categoryPath && categoryInfoMap[categoryPath]) {
            statVarCategoryMap[statVarId] = categoryInfoMap[categoryPath];
          } else if (categoryPath) {
            statVarCategoryMap[statVarId] = categoryPath.split("/").pop();
          }
        });

        // Next we get full information for all the stat vars
        const dcidsParam = statVars.map((id) => `dcids=${id}`).join("&");
        const variableResponse = await fetch(
          `${props.apiRoot || ""}/api/variable/info?${dcidsParam}`
        );
        const variableData = await variableResponse.json();

        // we create a set of provenances so that we can look them all up at once
        const provenances = new Set<string>();
        statVars.forEach((statVarId) => {
          const facetId = props.statVarToFacet?.[statVarId];
          const facetInfo = facetId ? props.facets[facetId] : null;
          if (facetInfo?.importName) {
            provenances.add(`dc/base/${facetInfo.importName}`);
          }
        });

        const provenanceMap: Record<string, any> = {};
        const provenancePromises = Array.from(provenances).map((provenanceId) =>
          fetch(`${props.apiRoot || ""}/api/node/triples/out/${provenanceId}`)
            .then((response) => response.json())
            .then((data) => {
              provenanceMap[provenanceId] = data;
            })
        );
        await Promise.all(provenancePromises);

        const metadata: Record<string, StatVarMetadata> = {};

        for (const statVarId of statVars) {
          const facetId = props.statVarToFacet?.[statVarId];
          const facetInfo = facetId ? props.facets[facetId] : null;

          if (!facetInfo?.importName) continue;

          const importName = facetInfo.importName;
          const provenanceId = `dc/base/${importName}`;
          const provenanceData = provenanceMap[provenanceId];

          if (!provenanceData) continue;

          let unit: string | undefined;
          let observationPeriod: string | undefined;
          let dateRangeStart: string | undefined;
          let dateRangeEnd: string | undefined;

          if (variableData[statVarId]?.provenanceSummary) {
            const sources = Object.values(
              variableData[statVarId].provenanceSummary
            );
            if (sources.length > 0) {
              const source = sources[0] as any;

              if (source.seriesSummary && source.seriesSummary.length > 0) {
                const seriesSummary = source.seriesSummary[0];
                dateRangeStart = seriesSummary.earliestDate;
                dateRangeEnd = seriesSummary.latestDate;

                const seriesKey = seriesSummary.seriesKey;
                if (seriesKey) {
                  unit = seriesKey.unit;
                  observationPeriod = seriesKey.observationPeriod;
                }
              }
            }
          }

          metadata[statVarId] = {
            statVarId,
            statVarName: responseObj[statVarId] || statVarId,
            category: statVarCategoryMap[statVarId],
            sourceName: provenanceData?.source[0]?.name,
            provenanceUrl: provenanceData?.url?.[0]?.value,
            provenanceName:
              provenanceData?.isPartOf?.[0]?.name ||
              provenanceData?.name?.[0]?.value ||
              importName,
            dateRangeStart,
            dateRangeEnd,
            unit,
            observationPeriod,
            license: provenanceData?.licenseType?.[0]?.name,
            licenseDcid: provenanceData?.licenseType?.[0]?.dcid,
          };
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
    statVarNames.length,
    dataCommonsClient,
    props.apiRoot,
    props.statVarToFacet,
    props.facets,
  ]);

  useEffect(() => {
    setStatVarNames([]);
  }, [props.facets, props.statVarToFacet]);

  const renderMetadataContent = (): ReactElement => {
    if (loading) {
      return null;
    }

    if (statVarNames.length === 0) {
      return <div>No metadata available.</div>;
    }

    const uniqueSourcesMap = new Map<
      string,
      { url?: string; sourceName?: string }
    >();
    statVarNames.forEach(([statVarId]) => {
      const metadata = metadataMap[statVarId];
      if (metadata && metadata.provenanceName) {
        uniqueSourcesMap.set(metadata.provenanceName, {
          url: metadata.provenanceUrl,
          sourceName: metadata.sourceName,
        });
      }
    });

    const citationSources = Array.from(uniqueSourcesMap.entries())
      .filter(([provenanceName]) => provenanceName)
      .map(([provenanceName, data]) => {
        const displayText = data.sourceName
          ? `${data.sourceName}, ${provenanceName}`
          : provenanceName;

        return data.url
          ? `${displayText} (${data.url.replace(/^https?:\/\//i, "")})`
          : displayText;
      });

    return (
      <div>
        {statVarNames.map(([statVarId, displayName]) => {
          const metadata = metadataMap[statVarId];
          if (!metadata) return null;

          const periodicity = metadata.observationPeriod
            ? humanizeIsoDuration(metadata.observationPeriod)
            : undefined;

          return (
            <div key={statVarId}>
              <h2>{displayName}</h2>

              <div>
                <div>
                  <div>
                    <h4>Source</h4>
                    {metadata.provenanceUrl && (
                      <div>
                        <a
                          href={metadata.provenanceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {metadata.provenanceUrl.replace(/^https?:\/\//i, "")}
                        </a>
                      </div>
                    )}
                    {(metadata.sourceName || metadata.provenanceName) && (
                      <div>
                        {[metadata.sourceName, metadata.provenanceName]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4>DCID / Topic</h4>
                    <div>
                      <a
                        href={
                          apiRootToHostname(props.apiRoot) +
                          SV_EXPLORER_REDIRECT_PREFIX +
                          statVarId
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {statVarId}
                      </a>
                    </div>
                    {metadata.category && <div>{metadata.category}</div>}
                  </div>
                </div>

                <div>
                  {(metadata.dateRangeStart || metadata.dateRangeEnd) && (
                    <div>
                      <h4>Date range</h4>
                      <div>
                        {[metadata.dateRangeStart, metadata.dateRangeEnd]
                          .filter(Boolean)
                          .join(" – ")}
                      </div>
                    </div>
                  )}

                  {(metadata.unit || periodicity) && (
                    <div>
                      <h4>
                        {metadata.unit && periodicity
                          ? "Unit / Periodicity"
                          : metadata.unit
                          ? "Unit"
                          : "Periodicity"}
                      </h4>
                      <div>
                        {[metadata.unit, periodicity]
                          .filter(Boolean)
                          .join(" / ")}
                      </div>
                    </div>
                  )}
                </div>

                {(metadata.license || metadata.licenseDcid) && (
                  <div>
                    <div>
                      <h4>License</h4>
                      <div>
                        {metadata.licenseDcid ? (
                          <a
                            href={`${apiRootToHostname(
                              props.apiRoot
                            )}/browser/${metadata.licenseDcid}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {metadata.license || metadata.licenseDcid}
                          </a>
                        ) : (
                          metadata.license
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {statVarId !== statVarNames[statVarNames.length - 1][0] && <hr />}
            </div>
          );
        })}

        {citationSources.length > 0 && (
          <div>
            <h3>Source and citation</h3>
            <p>
              Data sources • {citationSources.join(", ")} with minor processing
              by Data Commons.
            </p>
            <p>
              Citation guidance • Please credit all sources listed above. Data
              provided by third-party sources through Data Commons remains
              subject to the original provider&apos;s license terms.
            </p>
          </div>
        )}
      </div>
    );
  };

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
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        maxWidth="lg"
        fullWidth
        loading={loading}
      >
        <DialogTitle>{intl.formatMessage(messages.metadata)}</DialogTitle>
        <DialogContent>{renderMetadataContent()}</DialogContent>
        <DialogActions>
          <Button
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
