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
 * Component for showing and updating the mapping.
 */

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "reactstrap";

import {
  Column,
  CsvData,
  DCProperty,
  DCType,
  MappedThing,
  Mapping,
  MappingType,
  MappingVal,
} from "../types";
import { PlaceDetector } from "../utils/detect_place";
import { checkMappings } from "../utils/validation";
import { MappingColumnOptions } from "./mapping_column_options";
import { MappingConstantsSection } from "./mapping_constants_section";
import { MappingTable } from "./mapping_table";

export interface ColumnInfo {
  // the column of interest
  column: Column;
  // the mapped thing selected for column mapping type
  columnMappedThing: MappedThing;
  // the place type selected for column mapping type
  columnPlaceType: DCType;
  // the place property selected for column mapping type
  columnPlaceProperty: DCProperty;
  // the mapped thing selected for header mapping type
  headerMappedThing: MappedThing;
  // the place type selected for header mapping type
  headerPlaceType: DCType;
  // the place property selected for header mapping type
  headerPlaceProperty: DCProperty;
  // sample row values
  sampleValues: string[];
  // constants set for this column
  constants: Map<MappedThing, string>;
  // the mapping type selected
  type?: MappingType;
  // the mapped thing selected
  mappedThing?: string;
}

interface ColumnState {
  // key is column idx
  columns: Map<number, ColumnInfo>;
  selectedColumn: number;
}

interface MappingSectionProps {
  csvData: CsvData;
  predictedMapping: Mapping;
  onCorrectedMappingUpdated: () => void;
  onCorrectionsSubmitted: (
    correctedMapping: Mapping,
    correctedCsv: CsvData
  ) => void;
  placeDetector: PlaceDetector;
}

const DEFAULT_CONSTANT_VALS = {
  [MappedThing.DATE]: "",
  [MappedThing.STAT_VAR]: "",
  [MappedThing.UNIT]: "",
};

export function MappingSection(props: MappingSectionProps): JSX.Element {
  const [columnState, setColumnState] = useState<ColumnState>({
    columns: new Map(),
    selectedColumn: 0,
  });
  // key is mapped thing and value is the constant
  const [constantVals, setConstantVals] = useState<Record<string, string>>(
    DEFAULT_CONSTANT_VALS
  );
  const [showConfirmationButton, setShowConfirmationButton] =
    useState<boolean>(true);
  const [errorList, setErrorList] = useState<Array<string>>([]);
  const validPlaceTypeProperties = useRef(
    getValidPlaceTypeProperties(props.placeDetector)
  );

  useEffect(() => {
    const columns = getColumnInfo(
      props.csvData,
      props.predictedMapping,
      validPlaceTypeProperties.current,
      props.placeDetector
    );
    setColumnState({ columns, selectedColumn: 0 });
    setConstantVals(DEFAULT_CONSTANT_VALS);
    setErrorList([]);
  }, [props.csvData, props.predictedMapping, props.placeDetector]);

  useEffect(() => {
    props.onCorrectedMappingUpdated();
    setShowConfirmationButton(true);
  }, [columnState.columns, constantVals]);

  if (
    _.isEmpty(columnState) ||
    !columnState.columns.has(columnState.selectedColumn)
  ) {
    return null;
  }
  const selectedColumnInfo = columnState.columns.get(
    columnState.selectedColumn
  );
  return (
    <>
      <div className="section-container mapping-section">
        <div className="section-header">
          <h2>Confirm Mappings</h2>
        </div>
        <MappingTable
          csvData={props.csvData}
          selectedColumn={columnState.selectedColumn}
          onColumnSelected={(colIdx): void =>
            setColumnState({ ...columnState, selectedColumn: colIdx })
          }
          columnInfo={columnState.columns}
          onColumnUpdated={onColumnInfoUpdated}
        />
        <div className="selected-column-container">
          <MappingColumnOptions
            column={selectedColumnInfo}
            onColumnUpdated={(columnInfo: ColumnInfo): void =>
              onColumnInfoUpdated(columnState.selectedColumn, columnInfo)
            }
            validPlaceTypeProperties={validPlaceTypeProperties.current}
            placeDetector={props.placeDetector}
          />
          <div className="column-navigation-buttons">
            {/* button to select previous column */}
            <Button
              onClick={(): void => {
                const prevCol = Math.max(0, columnState.selectedColumn - 1);
                setColumnState({ ...columnState, selectedColumn: prevCol });
              }}
              disabled={columnState.selectedColumn === 0}
            >
              <i className="material-icons-outlined">arrow_back_ios</i>
              Prev
            </Button>
            {/* button to select next column */}
            <Button
              onClick={(): void => {
                const nextCol = Math.min(
                  props.csvData.orderedColumns.length,
                  columnState.selectedColumn + 1
                );
                setColumnState({ ...columnState, selectedColumn: nextCol });
              }}
              disabled={
                columnState.selectedColumn ===
                props.csvData.orderedColumns.length - 1
              }
            >
              Next
              <i className="material-icons-outlined">arrow_forward_ios</i>
            </Button>
          </div>
        </div>
      </div>
      <MappingConstantsSection
        constantVals={constantVals}
        onConstantValUpdated={(thing: string, val: string): void => {
          setConstantVals((prev) => {
            return { ...prev, [thing]: val };
          });
        }}
      />
      {showConfirmationButton && (
        <div className="confirmation-button">
          <Button onClick={(): void => onConfirmationClicked()}>Next</Button>
        </div>
      )}
      {!_.isEmpty(errorList) && (
        <div className="mapping-errors section-container">
          <span>
            There are errors in the mapping, please fix before continuing.
          </span>
          <ul>
            {errorList.map((error, idx) => {
              return <li key={`error-${idx}`}>{error}</li>;
            })}
          </ul>
        </div>
      )}
    </>
  );

  function onColumnInfoUpdated(
    columnIdx: number,
    updatedColumn: ColumnInfo
  ): void {
    const updatedColumnInfo = _.cloneDeep(columnState.columns);
    updatedColumnInfo.set(columnIdx, updatedColumn);
    setColumnState({ ...columnState, columns: updatedColumnInfo });
  }

  function onConfirmationClicked(): void {
    const correctedMapping = getMapping(columnState.columns, constantVals);
    const correctedCsv = updateCsvOrderedColumns(
      columnState.columns,
      props.csvData
    );
    const mappingErrors = checkMappings(correctedMapping);
    setErrorList(mappingErrors);
    if (_.isEmpty(mappingErrors)) {
      props.onCorrectionsSubmitted(correctedMapping, correctedCsv);
      setShowConfirmationButton(false);
    }
  }
}

// Get a map of place type to set of matching place properties
function getValidPlaceTypeProperties(
  placeDetector: PlaceDetector
): Record<string, Set<DCProperty>> {
  const validPlaceTypeProperties = {};
  placeDetector
    .getSupportedPlaceTypesAndProperties()
    .forEach((typeProperty) => {
      const type = typeProperty.dcType.dcid;
      if (!(type in validPlaceTypeProperties)) {
        validPlaceTypeProperties[type] = new Set();
      }
      if (!_.isEmpty(typeProperty.dcProperty)) {
        validPlaceTypeProperties[type].add(typeProperty.dcProperty);
      }
    });
  return validPlaceTypeProperties;
}

function getPlaceTypeProperty(
  colIdx: number,
  mappingVal: MappingVal,
  defaultPlaceType: DCType,
  validPlaceTypeProperties: Record<string, Set<DCProperty>>
): { placeType: DCType; placeProperty: DCProperty } {
  const placeType =
    colIdx in mappingVal.placeType
      ? mappingVal.placeType[colIdx]
      : defaultPlaceType;
  const placeProperty =
    colIdx in mappingVal.placeProperty
      ? mappingVal.placeProperty[colIdx]
      : Array.from(validPlaceTypeProperties[placeType.dcid])[0];
  return { placeType, placeProperty };
}

// Get a map of column id to its column info
function getColumnInfo(
  csvData: CsvData,
  predictedMapping: Mapping,
  validPlaceTypeProperties: Record<string, Set<DCProperty>>,
  placeDetector: PlaceDetector
): Map<number, ColumnInfo> {
  const defaultPlaceTypeName = Object.keys(validPlaceTypeProperties)[0];
  const defaultPlaceType = placeDetector.placeTypes.get(defaultPlaceTypeName);
  const defaultPlaceProperty = Array.from(
    validPlaceTypeProperties[defaultPlaceTypeName]
  )[0];
  const columnInfo = new Map();
  csvData.orderedColumns.forEach((column) => {
    columnInfo.set(column.columnIdx, {
      column,
      columnMappedThing: MappedThing[0],
      columnPlaceType: defaultPlaceType,
      columnPlaceProperty: defaultPlaceProperty,
      headerPlaceType: defaultPlaceType,
      headerPlaceProperty: defaultPlaceProperty,
      headerMappedThing: MappedThing[0],
      sampleValues: [],
      constants: new Map(),
    });
  });
  csvData.rowsForDisplay.forEach((rowVals) => {
    rowVals.forEach((val, idx) => {
      if (_.isEmpty(val)) {
        return;
      }
      const colInfo = columnInfo.get(idx);
      if (!_.isEmpty(colInfo)) {
        colInfo.sampleValues.push(val);
      }
    });
  });
  if (_.isEmpty(predictedMapping)) {
    return columnInfo;
  }
  predictedMapping.forEach((mappingVal, mappedThing) => {
    if (
      mappingVal.type === MappingType.COLUMN &&
      !_.isEmpty(mappingVal.column)
    ) {
      const colIdx = mappingVal.column.columnIdx;
      if (!columnInfo.has(colIdx)) {
        return;
      }
      columnInfo.get(colIdx).type = mappingVal.type;
      columnInfo.get(colIdx).mappedThing = mappedThing;
      columnInfo.get(colIdx).columnMappedThing = mappedThing;
      if (mappedThing === MappedThing.PLACE) {
        const placeTypeProperty = getPlaceTypeProperty(
          colIdx,
          mappingVal,
          defaultPlaceType,
          validPlaceTypeProperties
        );
        columnInfo.get(colIdx).columnPlaceType = placeTypeProperty.placeType;
        columnInfo.get(colIdx).columnPlaceProperty =
          placeTypeProperty.placeProperty;
      }
    } else if (
      mappingVal.type === MappingType.COLUMN_HEADER &&
      !_.isEmpty(mappingVal.headers)
    ) {
      for (const headerColumn of mappingVal.headers) {
        const colIdx = headerColumn.columnIdx;
        if (!columnInfo.has(colIdx)) {
          continue;
        }
        columnInfo.get(colIdx).type = mappingVal.type;
        columnInfo.get(colIdx).mappedThing = mappedThing;
        columnInfo.get(colIdx).headerMappedThing = mappedThing;
        if (mappedThing === MappedThing.PLACE) {
          const placeTypeProperty = getPlaceTypeProperty(
            colIdx,
            mappingVal,
            defaultPlaceType,
            validPlaceTypeProperties
          );
          columnInfo.get(colIdx).headerPlaceType = placeTypeProperty.placeType;
          columnInfo.get(colIdx).headerPlaceProperty =
            placeTypeProperty.placeProperty;
        }
      }
    } else if (
      mappingVal.type === MappingType.COLUMN_CONSTANT &&
      !_.isEmpty(mappingVal.columnConstants)
    ) {
      Object.entries(mappingVal.columnConstants).forEach(
        ([colIdx, constant]) => {
          columnInfo.get(Number(colIdx)).constants.set(mappedThing, constant);
        }
      );
    }
  });
  return columnInfo;
}

// Get the Mapping object for the given columnInfo and constants
function getMapping(
  columnInfo: Map<number, ColumnInfo>,
  constants: Record<string, string>
): Mapping {
  const mapping = new Map();
  columnInfo.forEach((info, columnIdx) => {
    if (_.isEmpty(info.mappedThing) || _.isEmpty(info.type)) {
      return;
    }
    if (info.type === MappingType.COLUMN) {
      const mappingVal: MappingVal = {
        type: MappingType.COLUMN,
        column: info.column,
        placeType: {},
        placeProperty: {},
      };
      if (info.mappedThing === MappedThing.PLACE) {
        mappingVal.placeType[columnIdx] = info.columnPlaceType;
        mappingVal.placeProperty[columnIdx] = info.columnPlaceProperty;
      }
      mapping.set(info.mappedThing, mappingVal);
    }
    if (info.type === MappingType.COLUMN_HEADER) {
      let mappingVal = mapping.get(info.mappedThing);
      if (
        _.isEmpty(mappingVal) ||
        mappingVal.type !== MappingType.COLUMN_HEADER
      ) {
        mappingVal = {
          type: MappingType.COLUMN_HEADER,
          headers: [],
          placeType: {},
          placeProperty: {},
        };
        mapping.set(info.mappedThing, mappingVal);
      }
      mappingVal.headers.push(info.column);
      if (info.mappedThing === MappedThing.PLACE) {
        mappingVal.placeType[columnIdx] = info.headerPlaceType;
        mappingVal.placeProperty[columnIdx] = info.headerPlaceProperty;
      }
    }
    if (!_.isEmpty(info.constants)) {
      info.constants.forEach((constant, mappedThing) => {
        let mappingVal = mapping.get(mappedThing);
        if (
          _.isEmpty(mappingVal) ||
          mappingVal.type !== MappingType.COLUMN_CONSTANT
        ) {
          mappingVal = {
            type: MappingType.COLUMN_CONSTANT,
            columnConstants: {},
          };
          mapping.set(mappedThing, mappingVal);
        }
        mappingVal.columnConstants[columnIdx] = constant;
      });
    }
  });
  Object.entries(constants).forEach(([mappedThing, val]) => {
    if (_.isEmpty(val)) {
      return;
    }
    mapping.set(mappedThing, {
      type: MappingType.FILE_CONSTANT,
      fileConstant: val,
    });
  });
  return mapping;
}

function updateCsvOrderedColumns(
  columnInfo: Map<number, ColumnInfo>,
  originalCsvData: CsvData
): CsvData {
  const updatedOrderedColumns = originalCsvData.orderedColumns.map((col) => {
    return columnInfo.get(col.columnIdx).column;
  });
  return {
    ...originalCsvData,
    orderedColumns: updatedOrderedColumns,
  };
}
