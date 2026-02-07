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
 * Displays the inner content of the metadata modal.
 *
 * This consists of each stat var used in the chart, and for each
 * stat var, relevant information about the provenance/source used by
 * that stat var.
 *
 * At the bottom of the inner content, we display a combined citation
 * section.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useMemo } from "react";

import { intl } from "../../../i18n/i18n";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { NamedNode } from "../../../shared/types";
import { StatVarFacetDateRangeMap } from "../../../utils/tile_utils";
import { buildCitationNodes, buildCitationParts } from "./citations";
import { StatVarMetadata } from "./metadata";
import { TileMetadataStatVarSection } from "./tile_metadata_stat_var_section";

interface TileMetadataModalContentProps {
  // a list of the stat var nodes (consisting of the stat var dcid and name)
  statVars: NamedNode[];
  // a map of the metadata for this section (a mix of stat var
  // and source metadata), with the key being the stat var dcid.
  metadataMap: Record<string, StatVarMetadata[]>;
  // A map of stat var dcids to facet IDs to their specific min and max date range from the chart
  statVarFacetDateRanges?: StatVarFacetDateRangeMap;
  // a set of stat var dcids that are used as denominators
  denomStatVarDcids?: Set<string>;
  // root URL used to generate stat var explorer and license links
  apiRoot?: string;
}

export const TileMetadataModalContent = ({
  statVars,
  metadataMap,
  statVarFacetDateRanges,
  denomStatVarDcids,
  apiRoot,
}: TileMetadataModalContentProps): ReactElement => {
  const theme = useTheme();

  const citationParts = useMemo(
    () => buildCitationParts(statVars, metadataMap, statVarFacetDateRanges),
    [statVars, metadataMap, statVarFacetDateRanges]
  );

  if (statVars.length === 0) {
    return (
      <p>{intl.formatMessage(metadataComponentMessages.NoMetadataAvailable)}</p>
    );
  }

  const uniqueSourcesMap = new Map<
    string,
    { url?: string; sourceName?: string }
  >();

  for (const statVarId in metadataMap) {
    metadataMap[statVarId].forEach((metadata) => {
      if (metadata && metadata.provenanceName) {
        uniqueSourcesMap.set(metadata.provenanceName, {
          url: metadata.provenanceUrl,
          sourceName: metadata.sourceName,
        });
      }
    });
  }

  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.lg}px;
      `}
    >
      {statVars.map((statVar) => (
        <TileMetadataStatVarSection
          key={statVar.dcid}
          statVar={statVar}
          metadataList={metadataMap[statVar.dcid] || []}
          isDenom={denomStatVarDcids && denomStatVarDcids.has(statVar.dcid)}
          apiRoot={apiRoot}
          statVarFacetDateRanges={
            statVarFacetDateRanges
              ? statVarFacetDateRanges[statVar.dcid]
              : undefined
          }
        />
      ))}

      {citationParts.length > 0 && (
        <div
          css={css`
            padding: ${theme.spacing.lg}px 0 0 0;
            border-top: 1px solid ${theme.colors.border.primary.light};
            && {
              h3 {
                ${theme.typography.family.heading}
                ${theme.typography.heading.xs}
                margin: 0 0 ${theme.spacing.sm}px 0;
                padding: 0 0 0 0;
                ${statVars.length > 4
                  ? "display: flex; justify-content: space-between;"
                  : ""}
              }
              p {
                ${theme.typography.family.text}
                ${theme.typography.text.md}
                white-space: pre-wrap;
                word-break: break-word;
                a {
                  white-space: pre-wrap;
                  word-break: break-word;
                }
              }
            }
          `}
        >
          <h3>
            {intl.formatMessage(metadataComponentMessages.SourceAndCitation)}
          </h3>
          <p>{buildCitationNodes(citationParts)}</p>
          <p>{intl.formatMessage(metadataComponentMessages.PleaseCredit)}</p>
        </div>
      )}
    </div>
  );
};
