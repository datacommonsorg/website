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

export enum MappingType {
  COLUMN = "column",
  COLUMN_HEADER = "columnHeader",
  FILE_CONSTANT = "fileConstant",
  // COLUMN_CONSTANT MappingType can be used for any MappedThing, but currently
  // the UI only supports COLUMN_CONSTANT for MappedThing.UNIT
  COLUMN_CONSTANT = "columnConstant",
}

export enum MappedThing {
  DATE = "Date",
  PLACE = "Place",
  STAT_VAR = "StatVar",
  UNIT = "Unit",
  VALUE = "Value",
}

export const MAPPED_THING_NAMES = {
  [MappedThing.VALUE]: "Observation Value",
  [MappedThing.STAT_VAR]: "Dcid of Variable",
};

// Types used for Detection.

// An abstraction for a Data Commons entity, e.g. a place type or property.
interface Entity {
  dcid: string;
  displayName: string;
}

// A Data Commons entity type, e.g. Country (which a type of Place).
export type DCType = Entity;

// A Data Commons property, e.g. longitude.
export type DCProperty = Entity;

// Denotes a level of confidence in the detection.
// It can be associated with any detected type.
export enum ConfidenceLevel {
  Uncertain,
  Low,
  High,
}

export interface TypeProperty {
  // The Data Commons type.
  dcType: DCType;

  // (Optional) The Data Commons property.
  dcProperty?: DCProperty;
}

export interface DetectedDetails {
  // The detected Type and (optional) Property.
  detectedTypeProperty: TypeProperty;

  // The level of confidence associated with the detection.
  confidence: ConfidenceLevel;
}
export interface Column {
  // Id of the column.
  // If in the original csv, there are two or more columns with the same header,
  // id will be <header>_<columnIdx>.
  // If a header is updated to a name that is a duplicate, id will be
  // <header>_<columnIdx>.
  // Otherwise, id will be the same as the header.
  id: string;
  // column header name, can either come from the original csv or updated by
  // user.
  header: string;
  // column index (leftmost column will be 0)
  columnIdx: number;
}

export interface MappingVal {
  type: MappingType;
  // Column that holds the mapping values. Should be set if type is
  // MappingType.COLUMN
  column?: Column;
  // When MappedThing is PLACE, the value corresponds to place property in KG
  placeProperty?: DCProperty;
  // When MappedThing is PLACE, the value corresponds to place type in KG
  placeType?: DCType;
  // List of column headers that act as the mapping values. Should be set if
  // type is MappingType.COLUMN_HEADERS
  headers?: Column[];
  // Constant value for the whole file as the mapping value. Should be set if
  // type is MappingType.FILE_CONSTANT
  fileConstant?: string;
  // Record of column idx to the constant to use for that column.
  // Should be set if type is MappingType.COLUMN_CONSTANT.
  columnConstants?: { [columnIdx: number]: string };
}

export type Mapping = Map<MappedThing, MappingVal>;

// CSV Row number.
export type RowNumber = number;

// CvsData should contain the minimum sufficient data from the
// data csv file which will be used for all processing, e.g. column detection,
// and display/rendering.
export interface CsvData {
  // This field should dictate the fixed (internal) order of all csv columns.
  orderedColumns: Array<Column>;

  // columnValuesSampled is a map from column index to an extract of the
  // values in the column. The column index is with reference to the order in
  // orderedColumns.
  // This extract could be all of the column's values or a sample. This is the
  // structure that should be used for detection heuristics and other advanced
  // processing.
  // It is assumed that all columns present in the original csv data file will
  // be represented in this structure. All indices in the orderedColumnNames
  // array should be present as keys of columnValuesSampled.
  // Note that the length of all column-values need not be the same, e.g. due to
  // the removal of duplicate values.
  columnValuesSampled: Map<number, Array<string>>;

  // rowsForDisplay is a mapping from the row index in the original csv file to
  // the contents of the row. This is a convenience structure to assist with
  // previews etc. It is not expected to contain the entire csv data, i.e. there
  // is no expectation that this structure contains all rows.
  // It is also assumed that order of values in the array will correspond to
  // the orderedColumnNames.
  rowsForDisplay: Map<RowNumber, Array<string>>;
  // row number of the header (1-indexed)
  headerRow: RowNumber;
  // row number of the first row of data (1-indexed), assume all subsequent rows
  // are data rows until lastDataRow
  firstDataRow: RowNumber;
  // row number of the last row of data (1-indexed)
  lastDataRow: RowNumber;
  // lsat row of the file
  lastFileRow: RowNumber;

  // The raw csv data can be either in the form of a file or a URL. One of the
  // following fields must be set:

  // if csv input was a user uploaded file, the uploaded csv file.
  rawCsvFile?: File;
  // if csv input was a user entered url, the url to get the csv file.
  rawCsvUrl?: string;
}

// A map from the mapped thing (aka StatVarObs props) to the property value.
export type Observation = Map<MappedThing, string>;

// Observations keyed by CSV row number. A row has multiple observations when
// the MappingVal is of type COLUMN_HEADER with multiple MappingVal.headers.
export type RowObservations = Map<RowNumber, Array<Observation>>;

// Map of cell value in the original csv to cell value in the cleaned csv.
// originalValue is a string converted to all lowercase.
export type ValueMap = { [originalValue: string]: string };
