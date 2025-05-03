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
import { startCase } from "lodash";
import React, { Fragment, ReactElement, ReactNode, useMemo } from "react";

import { ArrowOutward } from "../../../components/elements/icons/arrow_outward";
import { Tooltip } from "../../../components/elements/tooltip/tooltip";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { humanizeIsoDuration } from "../../../shared/periodicity";
import { NamedNode } from "../../../shared/types";
import { stripProtocol, truncateText } from "../../../shared/util";
import { apiRootToHostname } from "../../../utils/url_utils";
import { buildCitationParts } from "./citations";
import { StatVarMetadata } from "./tile_metadata_modal";

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";
const SOURCE_URL_TRUNCATION_POINT = 50;

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

  const citationParts = useMemo(
    () => buildCitationParts(statVars, metadataMap),
    [statVars, metadataMap]
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
  statVars.forEach((statVar) => {
    const metadata = metadataMap[statVar.dcid];
    if (metadata && metadata.provenanceName) {
      uniqueSourcesMap.set(metadata.provenanceName, {
        url: metadata.provenanceUrl,
        sourceName: metadata.sourceName,
      });
    }
  });

  const prepareSourceUrl = (url: string): string => {
    const withoutProtocol = stripProtocol(url);
    return withoutProtocol.endsWith("/")
      ? withoutProtocol.slice(0, -1)
      : withoutProtocol;
  };

  const citationSources: ReactNode[] = citationParts.map(({ label, url }) => {
    if (url) {
      const urlDisplay = stripProtocol(url);
      return (
        <Fragment key={label}>
          {label} (
          <a href={url} target="_blank" rel="noreferrer">
            {urlDisplay}
          </a>
          )
        </Fragment>
      );
    }
    return label;
  });

  const joinElements = (
    items: ReactNode[],
    separator: ReactNode = ", "
  ): ReactNode[] =>
    items.flatMap((item, idx) => (idx === 0 ? [item] : [separator, item]));

  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.lg}px;
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

        let sourceUrl: string | undefined;
        let isSourceUrlTruncated = false;
        if (metadata.provenanceUrl) {
          const sourceUrlWithoutProtocol = prepareSourceUrl(
            metadata.provenanceUrl
          );
          sourceUrl = truncateText(
            sourceUrlWithoutProtocol,
            SOURCE_URL_TRUNCATION_POINT,
            "middle"
          );
          isSourceUrlTruncated = sourceUrl !== sourceUrlWithoutProtocol;
        }

        const unitDisplay = metadata.unit
          ? startCase(metadata.unit)
          : undefined;
        const periodicity = metadata.observationPeriod
          ? humanizeIsoDuration(metadata.observationPeriod)
          : undefined;

        const hasDateRange = !!(
          metadata.dateRangeStart || metadata.dateRangeEnd
        );
        const hasUnit = !!unitDisplay;
        const hasPeriodicity = !!periodicity;

        const optionalFieldsCount = [
          hasDateRange,
          hasUnit,
          hasPeriodicity,
        ].filter(Boolean).length;
        const measurementMethodSpan = optionalFieldsCount % 2 === 0;

        return (
          <div
            key={statVarId}
            css={css`
              display: block;
              width: 100%;
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
                gap: 0 ${theme.spacing.lg}px;
                @media (max-width: ${theme.breakpoints.sm}px) {
                  grid-template-columns: 1fr;
                }
              `}
            >
              <div>
                <h4>{intl.formatMessage(messages.source)}</h4>
                {metadata.provenanceUrl && (
                  <p>
                    {isSourceUrlTruncated ? (
                      <Tooltip title={metadata.provenanceUrl}>
                        <a
                          href={metadata.provenanceUrl}
                          target="_blank"
                          rel="noreferrer"
                          css={css`
                            margin-right: ${theme.spacing.xs}px;
                          `}
                        >
                          {sourceUrl}
                          <ArrowOutward />
                        </a>
                      </Tooltip>
                    ) : (
                      <a
                        href={metadata.provenanceUrl}
                        target="_blank"
                        rel="noreferrer"
                        css={css`
                          margin-right: ${theme.spacing.xs}px;
                        `}
                      >
                        {sourceUrl}
                        <ArrowOutward />
                      </a>
                    )}
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
                {metadata.categories.length > 0 && (
                  <p>{metadata.categories.join(", ")}</p>
                )}
              </div>

              {hasDateRange && (
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

              {hasPeriodicity && (
                <div>
                  <h4>
                    {intl.formatMessage(
                      metadataComponentMessages.PublicationCadence
                    )}
                  </h4>
                  <p>{periodicity}</p>
                </div>
              )}

              {hasUnit && (
                <div>
                  <h4>{intl.formatMessage(metadataComponentMessages.Unit)}</h4>
                  <p>{unitDisplay}</p>
                </div>
              )}

              {metadata.measurementMethodDescription && (
                <div
                  css={css`
                    ${measurementMethodSpan
                      ? `
                          grid-column: 1 / span 2;
                          @media (max-width: ${theme.breakpoints.sm}px) {
                            grid-column: 1;
                          }
                        `
                      : ""}
                  `}
                >
                  <h4>
                    {intl.formatMessage(
                      metadataComponentMessages.MeasuringMethod
                    )}
                  </h4>
                  <p>
                    {metadata.measurementMethodDescription &&
                      metadata.measurementMethodDescription}
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
                        {startCase(metadata.license || metadata.licenseDcid)}
                      </a>
                    ) : (
                      startCase(metadata.license)
                    )}
                  </p>
                </div>
              )}
            </div>
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
            {joinElements(citationSources)}
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
