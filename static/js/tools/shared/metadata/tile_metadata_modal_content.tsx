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
import React, { ReactElement } from "react";

import { humanizeIsoDuration } from "../../../apps/base/utilities/utilities";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { NamedNode } from "../../../shared/types";
import { apiRootToHostname } from "../../../utils/url_utils";
import { StatVarMetadata } from "./tile_metadata_modal";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";

interface TileMetadataModalContentProps {
  statVars: NamedNode[];
  metadataMap: Record<string, StatVarMetadata>;
  apiRoot?: string;
}

export const TileMetadataModalContent = ({
  statVars,
  metadataMap,
  apiRoot,
}: TileMetadataModalContentProps): ReactElement => {
  const theme = useTheme();
  if (statVars.length === 0) {
    return (
      <div>
        {intl.formatMessage(metadataComponentMessages.NoMetadataAvailable)}
      </div>
    );
  }
  const uniqueSourcesMap = new Map<
    string,
    { url?: string; sourceName?: string }
  >();
  statVars.forEach((statVar) => {
    const metadata = metadataMap[statVar.dcid];
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
    <div
      css={css`
        width: 100%;
        display: flex;
        flex-direction: column;
        flex-gap: ${theme.spacing.lg};
        h4 {
          ${theme.typography.family.text}
          ${theme.typography.text.md}
          font-weight: 900;
          margin: 0;
        }
        p {
          ${theme.typography.family.text}
          ${theme.typography.text.md}
          white-space: pre-wrap;
          word-break: break-word;
        }
        a {
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}
    >
      {statVars.map((statVar) => {
        const statVarId = statVar.dcid;
        const statVarName = statVar.name;
        const metadata = metadataMap[statVarId];
        if (!metadata) return null;

        const periodicity = metadata.observationPeriod
          ? humanizeIsoDuration(metadata.observationPeriod)
          : undefined;

        return (
          <div
            key={statVarId}
            css={css`
              display: block;
              width: 100%;
              margin-bottom: ${theme.spacing.xl}px;
            `}
          >
            <h3
              css={css`
                ${theme.typography.family.text}
                ${theme.typography.text.lg}
                display: block;
                padding: 0 0 ${theme.spacing.sm}px 0;
                margin: 0 0 ${theme.spacing.md}px 0;
                border-bottom: 1px solid ${theme.colors.border.primary.light};
              `}
            >
              {statVarName}
            </h3>

            <div
              css={css`
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: ${theme.spacing.sm}px ${theme.spacing.lg}px;
                @media (max-width: ${theme.breakpoints.sm}px) {
                  grid-template-columns: 1fr;
                }
              `}
            >
              <div>
                <h4>{intl.formatMessage(messages.source)}</h4>
                {metadata.provenanceUrl && (
                  <p>
                    <a
                      href={metadata.provenanceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {metadata.provenanceUrl.replace(/^https?:\/\//i, "")}
                    </a>
                  </p>
                )}
                {(metadata.sourceName || metadata.provenanceName) && (
                  <p>
                    {[metadata.sourceName, metadata.provenanceName]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              <div>
                <h4>
                  {intl.formatMessage(metadataComponentMessages.DCID)} /{" "}
                  {intl.formatMessage(metadataComponentMessages.Topic)}
                </h4>
                <p>
                  <a
                    href={
                      apiRootToHostname(apiRoot) +
                      SV_EXPLORER_REDIRECT_PREFIX +
                      statVarId
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {statVarId}
                  </a>
                </p>
                {metadata.category && <p>{metadata.category}</p>}
              </div>

              {(metadata.dateRangeStart || metadata.dateRangeEnd) && (
                <div>
                  <h4>
                    {intl.formatMessage(
                      metadataComponentMessages.MetadataDateRange
                    )}
                  </h4>
                  <p>
                    {[metadata.dateRangeStart, metadata.dateRangeEnd]
                      .filter(Boolean)
                      .join(" – ")}
                  </p>
                </div>
              )}

              {(metadata.unit || periodicity) && (
                <div>
                  <h4>
                    {metadata.unit && periodicity
                      ? `${intl.formatMessage(
                          metadataComponentMessages.Unit
                        )} / ${intl.formatMessage(
                          metadataComponentMessages.Periodicity
                        )}`
                      : metadata.unit
                      ? intl.formatMessage(metadataComponentMessages.Unit)
                      : intl.formatMessage(
                          metadataComponentMessages.Periodicity
                        )}
                  </h4>
                  <p>
                    {[metadata.unit, periodicity].filter(Boolean).join(" / ")}
                  </p>
                </div>
              )}

              {(metadata.license || metadata.licenseDcid) && (
                <div
                  css={css`
                    grid-column: 1 / span 2;
                    @media (max-width: ${theme.breakpoints.sm}px) {
                      grid-column: 1;
                    }
                  `}
                >
                  <h4>
                    {intl.formatMessage(metadataComponentMessages.License)}
                  </h4>
                  <p>
                    {metadata.licenseDcid ? (
                      <a
                        href={`${apiRootToHostname(apiRoot)}/browser/${
                          metadata.licenseDcid
                        }`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {metadata.license || metadata.licenseDcid}
                      </a>
                    ) : (
                      metadata.license
                    )}
                  </p>
                </div>
              )}
            </div>
            {/* {statVarId !== statVars[statVars.length - 1].dcid && <hr />} */}
          </div>
        );
      })}

      {citationSources.length > 0 && (
        <div
          css={css`
            padding: ${theme.spacing.xl}px 0 0 0;
            border-top: 1px solid ${theme.colors.border.primary.light};
          `}
        >
          <h3
            css={css`
              ${theme.typography.family.heading}
              ${theme.typography.heading.xs}
              margin: 0 0 ${theme.spacing.sm}px 0;
            `}
          >
            {intl.formatMessage(metadataComponentMessages.SourceAndCitation)}
          </h3>
          <p>
            {intl.formatMessage(metadataComponentMessages.DataSources)} •{" "}
            {citationSources.join(", ")}{" "}
            {intl.formatMessage(metadataComponentMessages.MinorProcessing)}
          </p>
          <p>
            {intl.formatMessage(metadataComponentMessages.CitationGuidance)} •{" "}
            {intl.formatMessage(metadataComponentMessages.PleaseCredit)}
          </p>
        </div>
      )}
    </div>
  );
};
