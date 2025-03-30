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

import { Box } from "../../../../components/elements/wrappers/box";
import { intl } from "../../../../i18n/i18n";
import { componentPlaceSources } from "../../../../i18n/i18n_place_messages";
import { DataSourceGroup } from "../place_data";
import { PlaceDataSource } from "./place_data_source";

interface PlaceDataSourcesProps {
  //an array of data sources associated with a particular place
  placeDataSources: DataSourceGroup[];
}

export const PlaceDataSources = ({
  placeDataSources,
}: PlaceDataSourcesProps): ReactElement => {
  const theme = useTheme();
  return (
    <Box>
      <header>
        <h3
          css={css`
            ${theme.typography.family.heading}
            ${theme.typography.heading.xs}
          `}
        >
          {intl.formatMessage(componentPlaceSources.DataSources)}
        </h3>
      </header>
      {placeDataSources.map((placeDataSource) => (
        <PlaceDataSource
          key={placeDataSource.label}
          placeDataSource={placeDataSource}
        />
      ))}
    </Box>
  );
};
