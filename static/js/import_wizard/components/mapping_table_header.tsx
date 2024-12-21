/**
 * Copyright 2022 Google LLC
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
 * Component for showing the header of the table preview in the mapping section.
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Input } from "reactstrap";

import { MAPPED_THING_NAMES, MappedThing, MappingType } from "../types";
import { ColumnInfo } from "./mapping_section";

interface EditHeaderState {
  colIdx: number;
  header: string;
}
interface MappingTableHeaderProps {
  columnInfo: Map<number, ColumnInfo>;
  onColumnSelected: (colIdx: number) => void;
  highlightedColumnRef: React.RefObject<HTMLTableHeaderCellElement>;
  selectedColumn: number;
  onColumnUpdated: (colIdx: number, column: ColumnInfo) => void;
}

export function MappingTableHeader(
  props: MappingTableHeaderProps
): JSX.Element {
  const [editHeaderState, setEditHeaderState] = useState<EditHeaderState>({
    colIdx: -1,
    header: "",
  });
  const orderedColumns = Array.from(props.columnInfo.keys()).sort(
    (a, b) => a - b
  );

  useEffect(() => {
    // This will save the edit state when another column is selected
    if (
      editHeaderState.colIdx >= 0 &&
      editHeaderState.colIdx !== props.selectedColumn
    ) {
      onHeaderUpdated();
    }
  }, [props.selectedColumn]);

  return (
    <>
      <thead className="mapping-info-row">
        <tr>
          <th className="row-num"></th>
          {orderedColumns.map((columnIdx) => {
            const info = props.columnInfo.get(columnIdx);
            const isMapped =
              info.type === MappingType.COLUMN ||
              info.type === MappingType.COLUMN_HEADER;
            const hasUnit = !_.isEmpty(info.constants.get(MappedThing.UNIT));
            return (
              <th
                key={`mapping-info-${columnIdx}`}
                onClick={(): void => props.onColumnSelected(columnIdx)}
              >
                <>
                  <div className={isMapped ? "mapping-header-info" : ""}>
                    {getColumnMappingString(info)}
                  </div>
                  {hasUnit && (
                    <div className={hasUnit ? "mapping-header-info" : ""}>
                      unit: {info.constants.get(MappedThing.UNIT)}
                    </div>
                  )}
                </>
              </th>
            );
          })}
        </tr>
      </thead>
      <thead className="column-header-row">
        <tr>
          <th className="row-num">0</th>
          {orderedColumns.map((columnIdx) => {
            const info = props.columnInfo.get(columnIdx);
            return (
              <th
                key={`heading-${columnIdx}`}
                className={
                  props.selectedColumn === columnIdx ? "highlighted-col" : ""
                }
                ref={
                  props.selectedColumn === columnIdx
                    ? props.highlightedColumnRef
                    : null
                }
                onClick={(): void => props.onColumnSelected(columnIdx)}
              >
                {editHeaderState.colIdx === columnIdx ? (
                  <form
                    onSubmit={(event): void => {
                      event.preventDefault();
                      onHeaderUpdated();
                    }}
                  >
                    <Input
                      className="header-input"
                      type="text"
                      multiple={true}
                      onChange={(e): void => {
                        const val = e.target.value;
                        setEditHeaderState({ ...editHeaderState, header: val });
                      }}
                      value={editHeaderState.header}
                      onBlur={(): void => onHeaderUpdated()}
                      autoFocus={true}
                    />
                  </form>
                ) : (
                  <div>
                    <span>{info.column.header}</span>
                    <i
                      onClick={(): void =>
                        setEditHeaderState({
                          colIdx: columnIdx,
                          header: info.column.header,
                        })
                      }
                      className="material-icons-outlined"
                    >
                      edit
                    </i>
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    </>
  );

  function onHeaderUpdated(): void {
    const info = props.columnInfo.get(editHeaderState.colIdx);
    const newHeader = editHeaderState.header;
    const duplicateHeader = Array.from(props.columnInfo.values()).find(
      (col) => col.column.id === newHeader
    );
    const newId = !_.isEmpty(duplicateHeader)
      ? `${newHeader}_${editHeaderState.colIdx}`
      : newHeader;
    const updatedColumn = {
      ...info.column,
      id: newId,
      header: newHeader,
    };
    props.onColumnUpdated(editHeaderState.colIdx, {
      ...info,
      column: updatedColumn,
    });
    setEditHeaderState({ colIdx: -1, header: "" });
  }
}

function getColumnMappingString(column: ColumnInfo): string {
  const mThingName =
    MAPPED_THING_NAMES[column.mappedThing] || column.mappedThing;
  if (column.type === MappingType.COLUMN) {
    let mString = `Rows contain ${mThingName} values`;
    if (column.mappedThing === MappedThing.PLACE) {
      mString += ` of type ${column.columnPlaceType.displayName} and format ${column.columnPlaceProperty.displayName}`;
    }
    return mString;
  }
  if (column.type === MappingType.COLUMN_HEADER) {
    let mString = `Column title is a ${mThingName}`;
    if (column.mappedThing === MappedThing.PLACE) {
      mString += ` of type ${column.columnPlaceType.displayName} and format ${column.columnPlaceProperty.displayName}`;
    }
    return mString;
  }
  return "Column is skipped";
}
