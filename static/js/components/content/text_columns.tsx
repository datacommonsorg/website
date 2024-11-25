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
 * A component to display textual content in two columns
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface TextColumnsProps {
  //an optional header for the column section
  header?: string;
  //the content of the two columns, given as slot props:
  //<TextColumns.Left>...</TextColumns.Left><TextColumns.Right>...</TextColumns.Right>
  children: ReactElement | ReactElement[];
}

interface TextColumnsSlotProps {
  //the content that populates either of the two columns
  children: ReactElement | ReactElement[] | string;
}

const TextColumnsLeft = ({ children }: TextColumnsSlotProps): ReactElement => {
  return <div>{children}</div>;
};

const TextColumnsRight = ({ children }: TextColumnsSlotProps): ReactElement => {
  return <div>{children}</div>;
};

export const TextColumns = ({
  header,
  children,
}: TextColumnsProps): ReactElement => {
  const theme = useTheme();
  return (
    <article
      css={css`
        display: grid;
        grid-template-columns: 6fr 4fr;
        gap: ${theme.spacing.lg}px ${theme.spacing.xl}px;
        @media (max-width: ${theme.breakpoints.sm}px) {
          display: block;
        }
        & > div {
          h3,
          h4 {
            ${theme.typography.family.heading};
            ${theme.typography.heading.xl};
            margin-bottom: ${theme.spacing.lg}px;
          }
          p {
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          }
          ul {
            margin: 0;
            padding-left: ${theme.spacing.xl}px;
          }
          a.btn-primary {
            ${theme.radius.full};
            ${theme.typography.family.text};
            ${theme.typography.text.md};
            padding: ${theme.spacing.md}px ${theme.spacing.xl}px;
            background-color: ${theme.colors.button.primary.base};
            &:hover {
              ${theme.elevation.primary}
            }
          }
        }
      `}
    >
      {header && (
        <header
          css={css`
            grid-column: 1 / span 2;
            order: 0;
            @media (max-width: ${theme.breakpoints.sm}px) {
              grid-column: 1;
            }
          `}
        >
          <h3
            css={css`
              ${theme.typography.family.heading};
              ${theme.typography.heading.xl};
            `}
          >
            {header}
          </h3>
        </header>
      )}
      {children}
    </article>
  );
};

TextColumns.Left = TextColumnsLeft;
TextColumns.Right = TextColumnsRight;
