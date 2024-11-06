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
    <div className="container">
      <div className="brick-wall-block">
        {title && <h3>{title}</h3>}
        {columns.map((column, columnIndex) => (
          <div
            className={`brick-wall-section row-count-${numRows[columnIndex]}`}
            key={columnIndex}
          >
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
