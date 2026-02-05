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
 * One.org: A component to display the home hero component
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { HeroColumns } from "../../../../../components/content/hero_columns";

export const HomeHero = (): ReactElement => {
  const theme = useTheme();

  return (
    <HeroColumns columnRatioVariant="left-larger">
      <HeroColumns.Left>
        <h1
          css={css`
            ${theme.typography.heading.lg}
            font-style: normal;
            font-weight: 900;
            font-size: 60px;
            line-height: 120%;
            color: white;
            margin-bottom: 24px;
          `}
        >
          ONE Data Commons
        </h1>
        <p
          css={css`
            ${theme.typography.text.lg}
            color: white;
            font-style: normal;
            font-weight: 500;
            font-size: 25px;
            line-height: 140%;
          `}
        >
          This is a powerful tool combining the data and research from ONE Data
          and hundreds of billions of data points on economics, climate, health,
          demographics and more from Google&rsquo;s Data Commons.
        </p>
      </HeroColumns.Left>
    </HeroColumns>
  );
};
