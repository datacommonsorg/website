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
 * A component to display a section of data sources associated with a place.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Box } from "../../../components/elements/wrappers/box";
import { intl } from "../../../i18n/i18n";
import { pageMessages } from "../../../i18n/i18n_data_overview_messages";
import { DataSourceGroup } from "../place_data";
import { DataSource } from "./data_source";

interface DataSourcesProps {
  //an array of data sources associated with a particular place
  placeDataSources: DataSourceGroup[];
}

export const DataSources = ({
  placeDataSources,
}: DataSourcesProps): ReactElement => {
  const theme = useTheme();
  return (
    <Box
      sx={css`
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.md}px;
      `}
    >
      <header>
        <h3
          css={css`
            ${theme.typography.family.heading}
            ${theme.typography.heading.xs}
            margin: 0;
          `}
        >
          {intl.formatMessage(pageMessages.DataSources)}
        </h3>
      </header>
      {placeDataSources.map((placeDataSource) => (
        <DataSource
          key={placeDataSource.label}
          placeDataSource={placeDataSource}
        />
      ))}
    </Box>
  );
};
