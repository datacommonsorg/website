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

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useMemo } from "react";

interface BrickWallProps {
  // Optional title for the wall
  title?: string;
  // Array of React elements to be arranged on the wall
  bricks: ReactElement[];
}

// the number of columns that the brick wall is divided into
const NUM_COLUMNS = 2;
// the pattern of each column, where [2, 1, 1] means two bricks in the first row, then one brick then one brick
// the pattern then repeats
const patterns = [
  [2, 1, 1],
  [1, 2, 1],
];

export const BrickWall = ({ title, bricks }: BrickWallProps): ReactElement => {
  const theme = useTheme();
  // This function divides the bricks into columns (based on the NUM_COLUMNS above), and tracks the number of rows in
  // each column. The number of rows isn't simple to calculate because it varies based on the pattern of the bricks.
  const { columns, numRows } = useMemo(() => {
    const columns: ReactElement[][] = Array.from(
      { length: NUM_COLUMNS },
      () => []
    );
    const numRows: number[] = Array(NUM_COLUMNS).fill(0);
    const patternIndices = Array(NUM_COLUMNS).fill(0);

    let currentColumn = 0;

    for (let i = 0; i < bricks.length; ) {
      const columnPattern = patterns[currentColumn % patterns.length];
      const currentPattern = columnPattern[patternIndices[currentColumn]];

      for (let j = 0; j < currentPattern && i < bricks.length; j++, i++) {
        columns[currentColumn].push(bricks[i]);
      }

      numRows[currentColumn]++;
      patternIndices[currentColumn] =
        (patternIndices[currentColumn] + 1) % columnPattern.length;

      currentColumn = (currentColumn + 1) % NUM_COLUMNS;
    }

    return { columns, numRows };
  }, [bricks]);

  if (bricks.length === 0) {
    return null;
  }

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: ${theme.spacing.lg}px;
        @media (max-width: ${theme.breakpoints.sm}px) {
          grid-template-columns: 1fr;
        }
      `}
    >
      {title && (
        <header
          css={css`
            grid-column: 1 / span 2;
            width: 100%;
            max-width: ${theme.width.md}px;
            @media (max-width: ${theme.breakpoints.sm}px) {
              grid-column: 1;
            }
          `}
        >
          <h3
            css={css`
              ${theme.typography.family.heading}
              ${theme.typography.heading.md}
            `}
          >
            {title}
          </h3>
        </header>
      )}
      {columns.map((column, columnIndex) => (
        <div
          className={`row-count-${numRows[columnIndex]}`}
          key={columnIndex}
          css={css`
            margin: 0;
            padding: 0;
            display: grid;
            gap: ${theme.spacing.lg}px;
            align-items: start;
            justify-content: start;
            grid-template-columns: 1fr 1fr;
            &.row-count-0 {
              grid-template-columns: 1fr;
              grid-template-rows: max-content;
            }
            &.row-count-1 {
              grid-template-rows: 1fr;
            }
            &.row-count-2 {
              grid-template-rows: repeat(2, min-content);
            }
            &.row-count-3 {
              grid-template-rows: repeat(3, min-content);
            }
            &.row-count-4 {
              grid-template-rows: repeat(4, min-content);
            }
            &.row-count-5 {
              grid-template-rows: repeat(5, min-content);
            }
            &.row-count-6 {
              grid-template-rows: repeat(6, min-content);
            }
            @media (max-width: ${theme.breakpoints.sm}px) {
              grid-template-columns: 1fr;
            }
            &:nth-of-type(1) {
              & > div {
                &:nth-of-type(3),
                &:nth-of-type(4) {
                  grid-column: 1 / span 2;
                  @include media-breakpoint-down(sm) {
                    grid-column: 1;
                  }
                }
                &:nth-of-type(7),
                &:nth-of-type(8) {
                  grid-column: 1 / span 2;
                  @include media-breakpoint-down(sm) {
                    grid-column: 1;
                  }
                }
              }
            }
            &:nth-of-type(2) {
              & > div {
                &:nth-of-type(1),
                &:nth-of-type(4) {
                  grid-column: 1 / span 2;
                  @include media-breakpoint-down(sm) {
                    grid-column: 1;
                  }
                }
                &:nth-of-type(5),
                &:nth-of-type(8) {
                  grid-column: 1 / span 2;
                  @include media-breakpoint-down(sm) {
                    grid-column: 1;
                  }
                }
              }
            }
          `}
        >
          {column.map((brick, i) => (
            <div
              key={i}
              css={css`
                display: block;
                a {
                  ${theme.box.primary}
                  ${theme.elevation.primary}
                  ${theme.typography.family.text}
                  ${theme.typography.text.xl}
                  ${theme.radius.primary}
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                  gap: ${theme.spacing.md}px;
                  padding: ${theme.spacing.lg}px;
                }
              `}
            >
              {brick}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
