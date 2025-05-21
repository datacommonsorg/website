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
import styled from "@emotion/styled";
import { startCase } from "lodash";
import React, { ReactElement } from "react";

import { ArrowOutward } from "../../../components/elements/icons/arrow_outward";
import { intl } from "../../../i18n/i18n";
import { messages } from "../../../i18n/i18n_messages";
import { metadataComponentMessages } from "../../../i18n/i18n_metadata_messages";
import { humanizeIsoDuration } from "../../../shared/periodicity";
import { NamedNode } from "../../../shared/types";
import { stripProtocol } from "../../../shared/util";
import { apiRootToHostname } from "../../../utils/url_utils";
import { StatVarMetadata } from "./metadata";

interface TileMetadataStatVarSectionProps {
  // the stat var node (consisting of the stat var dcid and name)
  statVar: NamedNode;
  // the list of metadata for this section (a mix of stat var and source metadata)
  metadataList: StatVarMetadata[];
  // root URL used to generate stat var explorer and license links
  apiRoot?: string;
}

const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";

export const TileMetadataStatVarSection = ({
  statVar,
  metadataList,
  apiRoot,
}: TileMetadataStatVarSectionProps): ReactElement | null => {
  const theme = useTheme();
  if (!metadataList || metadataList.length === 0) return null;

  const prepareSourceUrl = (url: string): string => {
    const withoutProtocol = stripProtocol(url);
    return withoutProtocol.endsWith("/")
      ? withoutProtocol.slice(0, -1)
      : withoutProtocol;
  };

  const ContentWrapper = styled.div`
    && {
      display: flex;
      flex-direction: column;
      gap: 0;
      h4 {
        ${theme.typography.family.text}
        ${theme.typography.text.md}  
        font-weight: 900;
        margin: 0 0 ${theme.spacing.xs}px 0;
      }
      p {
        ${theme.typography.family.text}
        ${theme.typography.text.md}
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
      }
      a {
        white-space: pre-wrap;
        word-break: break-word;
      }
    }
  `;

  return (
    <div
      key={statVar.dcid}
      css={css`
        display: block;
        width: 100%;
        && > h3 {
          ${theme.typography.family.text}
          ${theme.typography.text.lg}
          ${metadataList.length > 1
            ? "display: flex; justify-content: space-between;"
            : "display: block;"}
          padding: 0 0 ${theme.spacing.sm}px 0;
          margin: 0 0 ${theme.spacing.md}px 0;
          border-bottom: 1px solid ${theme.colors.border.primary.light};
        }
      `}
    >
      <h3>
        {statVar.name}
        {metadataList.length > 1 && (
          <small
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.md}
            `}
          >
            {metadataList.length}{" "}
            {intl.formatMessage(messages.sourcesLowercase)}
          </small>
        )}
      </h3>

      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${theme.spacing.md}px;
          margin-top: ${theme.spacing.md}px;
        `}
      >
        {metadataList.map((metadata) => {
          let sourceUrl: string = metadata.provenanceUrl;
          if (metadata.provenanceUrl) {
            sourceUrl = prepareSourceUrl(metadata.provenanceUrl);
          }

          const unitDisplay = metadata.unit
            ? startCase(metadata.unit)
            : undefined;
          const periodicity = metadata.periodicity
            ? humanizeIsoDuration(metadata.periodicity)
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
              key={`${metadata.statVarId}-${metadata.provenanceName}`}
              css={css`
                ${metadataList.length > 1
                  ? `padding-bottom:${theme.spacing.md}px; 
                     border-bottom:1px dashed ${theme.colors.border.primary.light}; 
                     &:last-of-type{ border:none; margin-bottom: 0; }`
                  : ""}
              `}
            >
              <div
                css={css`
                  display: grid;
                  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                  gap: ${theme.spacing.md}px ${theme.spacing.lg}px;
                  @media (max-width: ${theme.breakpoints.sm}px) {
                    grid-template-columns: minmax(0, 1fr);
                  }
                `}
              >
                <ContentWrapper>
                  <h4>{intl.formatMessage(messages.source)}</h4>
                  {(metadata.sourceName || metadata.provenanceName) && (
                    <p>
                      {[metadata.sourceName, metadata.provenanceName]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {metadata.provenanceUrl && (
                    <p>
                      <a
                        href={metadata.provenanceUrl}
                        target="_blank"
                        rel="noreferrer"
                        css={css`
                          display: flex;
                          align-items: center;
                          overflow: hidden;
                          white-space: nowrap;
                          min-width: 0;
                        `}
                      >
                        <span
                          css={css`
                            flex: 0 1 auto;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            min-width: 0;
                          `}
                        >
                          {sourceUrl}
                        </span>
                        <ArrowOutward
                          css={css`
                            flex-shrink: 0;
                          `}
                        />
                      </a>
                    </p>
                  )}
                </ContentWrapper>

                <ContentWrapper>
                  <h4>
                    {intl.formatMessage(metadataComponentMessages.Topic)} /{" "}
                    {intl.formatMessage(metadataComponentMessages.DCID)}
                  </h4>
                  {metadata.categories && metadata.categories.length > 0 && (
                    <p>{metadata.categories.join(", ")}</p>
                  )}
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
                </ContentWrapper>

                {hasDateRange && (
                  <ContentWrapper>
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
                  </ContentWrapper>
                )}

                {hasPeriodicity && (
                  <ContentWrapper>
                    <h4>
                      {intl.formatMessage(
                        metadataComponentMessages.PublicationCadence
                      )}
                    </h4>
                    <p>
                      {periodicity} ({metadata.periodicity})
                    </p>
                  </ContentWrapper>
                )}

                {hasUnit && (
                  <ContentWrapper>
                    <h4>
                      {intl.formatMessage(metadataComponentMessages.Unit)}
                    </h4>
                    <p>{unitDisplay}</p>
                  </ContentWrapper>
                )}

                {metadata.measurementMethodDescription && (
                  <ContentWrapper
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
                    <p>{metadata.measurementMethodDescription}</p>
                  </ContentWrapper>
                )}

                {(metadata.license || metadata.licenseDcid) && (
                  <ContentWrapper
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
                  </ContentWrapper>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
