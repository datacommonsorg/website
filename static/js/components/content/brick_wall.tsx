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

import React, { ReactElement, useMemo } from "react";

/**
 * A component to display a wall of arbitrary elements arranged like bricks.
 * An example of this is on the explorer page, where query links are arranged
 * in this way.
 */

interface BrickWallProps {
  //if given the title will be displayed as an introduction to the wall
  title?: string;
  //an array of Reacts elements to be arranged on the wall. If empty, the wall will not display.
  bricks: ReactElement[];
}

const NUM_COLUMNS = 2;

export const BrickWall = ({ title, bricks }: BrickWallProps): ReactElement => {
  const brickColumns = useMemo(() => {
    const columnCount = Math.ceil(bricks.length / NUM_COLUMNS);

    return Array.from({ length: NUM_COLUMNS }, (_, column) =>
      bricks.slice(column * columnCount, column * columnCount + columnCount)
    );
  }, [bricks]);

  if (bricks.length === 0) {
    return null;
  }
  return (
    <div className="container">
      <div className="brick-wall-block">
        <h3>{title}</h3>
        {brickColumns.map((column, columnIndex) => (
          <div className="brick-wall-section" key={columnIndex}>
            {column.map((brick, i) => (
              <div className="brick-wall-item" key={i}>
                {brick}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
