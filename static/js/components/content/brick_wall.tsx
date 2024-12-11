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

  // This function spreads the bricks among the columns, effectively generating the mortar pattern based on the
  // pattern set given above. Each column is represented by an object containing the bricks, and a patternEntry
  // array that gives the corresponding pattern type for the brick at that index (i.e., does the brick take up
  // two spaces or one). This is used in the component to correctly style the bricks.
  const { columnData } = useMemo(() => {
    const columnData: { bricks: ReactElement[]; patternEntries: number[] }[] = [
      { bricks: [], patternEntries: [] },
      { bricks: [], patternEntries: [] },
    ];

    const patternIndices = [0, 0];
    let currentColumn = 0;
    let i = 0;

    while (i < bricks.length) {
      const pattern = patterns[currentColumn];
      const entry = pattern[patternIndices[currentColumn]];

      for (let j = 0; j < entry && i < bricks.length; j++, i++) {
        columnData[currentColumn].bricks.push(bricks[i]);
        columnData[currentColumn].patternEntries.push(entry);
      }

      patternIndices[currentColumn] =
        (patternIndices[currentColumn] + 1) % pattern.length;
      currentColumn = (currentColumn + 1) % NUM_COLUMNS;
    }

    return { columnData };
  }, [bricks]);

  if (bricks.length === 0) {
    return null;
  }

  return (
    <>
      {title && (
        <header
          css={css`
            margin-bottom: ${theme.spacing.xl}px;
          `}
        >
          <h3
            css={css`
              ${theme.typography.family.heading};
              ${theme.typography.heading.md};
            `}
          >
            {title}
          </h3>
        </header>
      )}
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(${NUM_COLUMNS}, 1fr);
          gap: ${theme.spacing.lg}px;
          @media (max-width: ${theme.breakpoints.md}px) {
            grid-template-columns: 1fr;
          }
        `}
      >
        {columnData.map((column, columnIndex) => (
          <div
            key={columnIndex}
            css={css`
              display: block;
            `}
          >
            <div
              css={css`
                display: grid;
                gap: ${theme.spacing.lg}px;
                grid-template-columns: 1fr 1fr;
                @media (max-width: ${theme.breakpoints.sm}px) {
                  grid-template-columns: 1fr;
                }
              `}
            >
              {column.bricks.map((brick, i) => {
                const isSingleBrickRow = column.patternEntries[i] === 1;

                return (
                  <div
                    key={i}
                    css={css`
                      ${isSingleBrickRow &&
                      css`
                        grid-column: 1 / span 2;
                        @media (max-width: ${theme.breakpoints.sm}px) {
                          grid-column: 1;
                        }
                      `}

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
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
