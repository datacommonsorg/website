/**
 * Copyright 2024 Google LLC
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
 * A component to display the home hero component
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { HeroSimple } from "../../../components/content/hero_simple";
import { LinkChips } from "../../../components/content/link_chips";
import { Link, LinkChip } from "../../../components/elements/link_chip";

interface HomeHeroProps {
  //an array of links to be rendered by the component
  linkChips: Link[];
}

export const HomeHero = ({ linkChips }: HomeHeroProps): ReactElement => {
  const theme = useTheme();
  return (
    <HeroSimple>
      <>
        <h1
          css={css`
            ${theme.typography.heading.lg}
            margin-bottom: ${theme.spacing.xxl}px;
          `}
        >
          Data Commons brings together the world&apos;s public data, harmonized
          for your exploration
        </h1>
        <LinkChips
          header={"Topics to explore"}
          headerComponent="h4"
          section="topic"
          linkChips={linkChips}
        />
        <div
          css={css`
            margin-top: ${theme.spacing.xxl}px;
          `}
        >
          <LinkChip
            variant="flat"
            linkChip={{
              id: "data-sources",
              title: "See all available data sources",
              url: "https://docs.datacommons.org/datasets/",
            }}
          />
        </div>
      </>
    </HeroSimple>
  );
};
