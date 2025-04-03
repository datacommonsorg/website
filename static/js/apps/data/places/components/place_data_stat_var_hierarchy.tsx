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
 * A component that wraps the StatVarHierarchy for display in the place data page
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Box } from "../../../../components/elements/wrappers/box";
import { StatVarHierarchyType } from "../../../../shared/types";
import { StatVarHierarchy } from "../../../../stat_var_hierarchy/stat_var_hierarchy";
import { Place } from "../place_data";

interface PlaceDataStatVarHierarchyProps {
  //the place for which we will render a StatVarHierarchy tool
  place: Place;
}

export const PlaceDataStatVarHierarchy = ({
  place,
}: PlaceDataStatVarHierarchyProps): ReactElement => {
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
          Statistical Variables
        </h3>
      </header>
      <StatVarHierarchy
        type={StatVarHierarchyType.BROWSER}
        entities={[{ dcid: place.dcid, name: place.name }]}
      />
    </Box>
  );
};
