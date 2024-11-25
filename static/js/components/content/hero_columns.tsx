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
 * A component to display the columned hero component.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface HeroColumnsProps {
  //the content of the two hero columns, given as slot props:
  //<TextColumns.Left>...</TextColumns.Left><TextColumns.Right>...</TextColumns.Right>
  children: ReactElement | ReactElement[];
}

interface HeroColumnsSlotProps {
  //the content that populates either of the two columns
  children: ReactElement | ReactElement[] | string;
}

const HeroColumnsLeft = ({ children }: HeroColumnsSlotProps): ReactElement => {
  const theme = useTheme();
  return (
    <header
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.xxl}px;
        @media (max-width: ${theme.breakpoints.sm}px) {
          gap: ${theme.spacing.md}px;
        }
      `}
    >
      {children}
    </header>
  );
};

const HeroColumnsRight = ({ children }: HeroColumnsSlotProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.xxl}px;
        @media (max-width: ${theme.breakpoints.sm}px) {
          gap: ${theme.spacing.md}px;
          margin-bottom: ${theme.spacing.xxl}px;
        }
      `}
    >
      {children}
    </div>
  );
};

export const HeroColumns = ({ children }: HeroColumnsProps): ReactElement => {
  const theme = useTheme();
  return (
    <article
      css={css`
        display: grid;
        grid-template-columns: 6fr 4fr;
        gap: ${theme.spacing.xl}px;
        @media (max-width: ${theme.breakpoints.sm}px) {
          display: block;
        }
        & > div,
        & > header {
          color: ${theme.colors.text.primary.light};
          a {
            color: ${theme.colors.link.primary.light};
          }
          h2,
          h1 {
            ${theme.typography.family.heading};
            ${theme.typography.heading.xl};
          }
          h3,
          h4 {
            ${theme.typography.family.heading};
            ${theme.typography.heading.xs};
          }
          p {
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          }
        }
      `}
    >
      {children}
    </article>
  );
};

HeroColumns.Left = HeroColumnsLeft;
HeroColumns.Right = HeroColumnsRight;
