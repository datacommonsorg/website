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
 * The header for a place overview page.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Section } from "../../../components/elements/layout/section";
import { intl, LocalizedLink } from "../../../i18n/i18n";
import { pageMessages } from "../../../i18n/i18n_data_overview_messages";
import { Place } from "../place_data";

interface DataOverviewHeaderProps {
  //the place data object; an object comprising the place, data sources and example stat vars
  place: Place;
}

export const DataOverviewHeader = ({
  place,
}: DataOverviewHeaderProps): ReactElement => {
  const theme = useTheme();

  return (
    <>
      <Section
        variant="compact"
        innerSx={css`
          display: flex;
          justify-content: space-between;
          align-items: center;
        `}
      >
        <h3
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.heading.sm};
            margin-left: ${theme.spacing.sm}px;
          `}
        >
          <a href={`/place/${place.dcid}`}>{place.name}</a> ·{" "}
          {intl.formatMessage(pageMessages.DataOverview)}
        </h3>
        <div
          css={css`
            margin-right: ${theme.spacing.sm}px;
          `}
        >
          {place.dcid} ·{" "}
          <LocalizedLink
            href={`/browser/${place.dcid}`}
            text={intl.formatMessage(pageMessages.SeeKnowledgeGraph)}
          />
        </div>
      </Section>
    </>
  );
};
