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
 * Displays a single stat var section inside a metadata modal.
 *
 * This section will contain relevant information about the stat var
 * and the provenance/source used by the stat var.
 *
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import { startCase } from "lodash";
import React, { ReactElement } from "react";

import { ArrowOutward } from "../../../components/elements/icons/arrow_outward";
import { Tooltip } from "../../../components/elements/tooltip/tooltip";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { humanizeIsoDuration } from "../../../shared/periodicity";
import { NamedNode } from "../../../shared/types";
import { stripProtocol, truncateText } from "../../../shared/util";
import { apiRootToHostname } from "../../../utils/url_utils";
import { StatVarMetadata } from "./metadata";

interface TileMetadataStatVarSectionProps {
  // the stat var node (consisting of the stat var dcid and name)
  statVar: NamedNode;
  // the metadata for this section (a mix of stat var and source metadata)
  // with the key being the stat var dcid.
  metadata: StatVarMetadata;
  // root URL used to generate stat var explorer and license links
  apiRoot?: string;
}

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";
const SOURCE_URL_TRUNCATION_POINT = 50;

export const TileMetadataStatVarSection = ({
  statVar,
  metadata,
  apiRoot,
}: TileMetadataStatVarSectionProps): ReactElement | null => {
  const theme = useTheme();
  if (!metadata) return null;

  const prepareSourceUrl = (url: string): string => {
    const withoutProtocol = stripProtocol(url);
    return withoutProtocol.endsWith("/")
      ? withoutProtocol.slice(0, -1)
      : withoutProtocol;
  };

  let sourceUrl: string | undefined;
  let isSourceUrlTruncated = false;
  if (metadata.provenanceUrl) {
    const sourceUrlWithoutProtocol = prepareSourceUrl(metadata.provenanceUrl);
    sourceUrl = truncateText(
      sourceUrlWithoutProtocol,
      SOURCE_URL_TRUNCATION_POINT,
      "middle"
    );
    isSourceUrlTruncated = sourceUrl !== sourceUrlWithoutProtocol;
  }

  const unitDisplay = metadata.unit ? startCase(metadata.unit) : undefined;
  const periodicity = metadata.periodicity
    ? humanizeIsoDuration(metadata.periodicity)
    : undefined;

  const hasDateRange = !!(metadata.dateRangeStart || metadata.dateRangeEnd);
  const hasUnit = !!unitDisplay;
  const hasPeriodicity = !!periodicity;

  const optionalFieldsCount = [hasDateRange, hasUnit, hasPeriodicity].filter(
    Boolean
  ).length;
  const measurementMethodSpan = optionalFieldsCount % 2 === 0;

  return (
    <div
      key={statVar.dcid}
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
        {statVar.name}
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
                statVar.dcid
              }
              target="_blank"
              rel="noreferrer"
            >
              {statVar.dcid}
            </a>
          </p>
          {metadata.categories.length > 0 && (
            <p>{metadata.categories.join(", ")}</p>
          )}
        </div>

        {hasDateRange && (
          <div>
            <h4>
              {intl.formatMessage(metadataComponentMessages.MetadataDateRange)}
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
              {intl.formatMessage(metadataComponentMessages.PublicationCadence)}
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
              {intl.formatMessage(metadataComponentMessages.MeasuringMethod)}
            </h4>
            <p>{metadata.measurementMethodDescription}</p>
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
            <h4>{intl.formatMessage(metadataComponentMessages.License)}</h4>
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
};
