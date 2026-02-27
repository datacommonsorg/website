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
 * Component to display the details of the provided facet within the facet selector.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import _, { startCase } from "lodash";
import React, { ReactElement } from "react";

import { InfoFilled } from "../../components/elements/icons/info";
import { Tooltip } from "../../components/elements/tooltip/tooltip";
import { intl } from "../../i18n/i18n";
import { facetSelectionComponentMessages } from "../../i18n/i18n_facet_selection_messages";
import { metadataComponentMessages } from "../../i18n/i18n_metadata_messages";
import { humanizeIsoDuration } from "../periodicity";
import { StatMetadata } from "../stat_types";
import { SELECTOR_PREFIX } from "./facet_selector";

interface FacetOptionContentProps {
  // The metadata for the facet.
  metadata?: StatMetadata;
  // An optional display name for the facet's source.
  displayName?: string;
  // the mode of the facet selector determines the copy used in the instruction
  mode?: "chart" | "download";
  // a list of the stat vars applicable to this facet. This is used in
  // the grouped view to indicate the number of stat vars this facet applies to
  applicableStatVars?: { dcid: string; name: string }[];
  // the total number of stat vars in the metadata modal. This is used in
  // conjunction with the above applicable stat vars to display the applicable
  // stat vars (where relevant).
  totalStatVars?: number;
}

interface StatVarTooltipContentProps {
  items: { dcid: string; name: string }[];
}

const StatVarTooltipContent = ({
  items,
}: StatVarTooltipContentProps): ReactElement => (
  <ul
    css={css`
      list-style: disc;
      padding: 0;
      margin: 0 0 0 12px;
      text-align: left;
    `}
  >
    {items.map((sv) => (
      <li
        key={sv.dcid}
        css={css`
          padding: 0;
          margin: 0;
        `}
      >
        {sv.name}
      </li>
    ))}
  </ul>
);

export function FacetOptionContent({
  metadata = {},
  displayName,
  mode,
  applicableStatVars,
  totalStatVars,
}: FacetOptionContentProps): ReactElement {
  const theme = useTheme();
  let primaryTitle: string;
  let firstDetailItem: string | undefined;

  if (_.isEmpty(metadata)) {
    primaryTitle = intl.formatMessage(
      mode === "download"
        ? facetSelectionComponentMessages.CombinedDatasetForDownloadOption
        : facetSelectionComponentMessages.CombinedDatasetForChartsOption
    );
  } else {
    const sourceTitle =
      displayName || metadata.sourceName || metadata.importName;
    primaryTitle = metadata.provenanceName || sourceTitle;
    if (primaryTitle !== sourceTitle) {
      firstDetailItem = sourceTitle;
    }
  }

  const dateRange = [metadata.dateRangeStart, metadata.dateRangeEnd]
    .filter(Boolean)
    .join(" – ");

  let observationPeriodDisplay: string;
  if (metadata.observationPeriod) {
    const humanizedPeriod = humanizeIsoDuration(metadata.observationPeriod);
    observationPeriodDisplay =
      humanizedPeriod !== metadata.observationPeriod
        ? `${humanizedPeriod} (${metadata.observationPeriod})`
        : humanizedPeriod;
  }

  return (
    <div
      className={`${SELECTOR_PREFIX}-facet-option-title`}
      css={css`
        position: relative;
        margin: 0;
        padding: 0;
      `}
    >
      <p
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.md}
          margin: 0;
          padding: 0;
          white-space: pre-wrap;
          word-break: break-word;
        `}
      >
        {primaryTitle}
      </p>
      <ul
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.sm}
          color: ${theme.colors.text.tertiary.dark};
          margin: 0;
          padding: 0;
          li {
            list-style: none;
            margin: 0;
            padding: 0;
            white-space: pre-wrap;
            word-break: break-word;
          }
        `}
      >
        {applicableStatVars &&
          totalStatVars &&
          applicableStatVars.length < totalStatVars && (
            <li>
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${theme.spacing.xs}px;
                `}
              >
                {intl.formatMessage(
                  facetSelectionComponentMessages.AvailableStatVarsMultipleMessage,
                  {
                    count: applicableStatVars.length,
                    total: totalStatVars,
                  }
                )}
                <Tooltip
                  title={<StatVarTooltipContent items={applicableStatVars} />}
                >
                  <InfoFilled
                    css={css`
                      color: ${theme.colors.button.primary.light};
                    `}
                  />
                </Tooltip>
              </span>
            </li>
          )}
        {firstDetailItem && <li>{firstDetailItem}</li>}
        {metadata.measurementMethodDescription && (
          <li>{metadata.measurementMethodDescription}</li>
        )}
        {metadata.unitDisplayName && (
          <li>
            {intl.formatMessage(metadataComponentMessages.Unit)} •{" "}
            {startCase(metadata.unitDisplayName)}
          </li>
        )}
        {metadata.scalingFactor && (
          <li>Scaling Factor • {metadata.scalingFactor}</li>
        )}
        {metadata.isDcAggregate && (
          <li>
            {intl.formatMessage(metadataComponentMessages.DataCommonsAggregate)}
          </li>
        )}
        {observationPeriodDisplay && (
          <li>
            {intl.formatMessage(metadataComponentMessages.ObservationPeriod)} •{" "}
            {observationPeriodDisplay}
          </li>
        )}
        {dateRange && (
          <li>
            {intl.formatMessage(metadataComponentMessages.MetadataDateRange)} •{" "}
            {dateRange}
          </li>
        )}
      </ul>
    </div>
  );
}
