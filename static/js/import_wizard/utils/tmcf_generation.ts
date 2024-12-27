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

import { MappedThing, Mapping, MappingType, MappingVal } from "../types";

const FIXED_CSV_TABLE = "CSVTable";
const SVOBS_TYPE = "StatVarObservation";
const PLACE_TYPE = "Place";
const DCID_PROP = "dcid";
const VALUE_PROP = "value";
const MAPPED_THING_TO_SVOBS_PROP = new Map<MappedThing, string>([
  [MappedThing.PLACE, "observationAbout"],
  [MappedThing.STAT_VAR, "variableMeasured"],
  [MappedThing.DATE, "observationDate"],
  [MappedThing.UNIT, "unit"],
  [MappedThing.VALUE, VALUE_PROP],
]);

//
// A set of node/pv generation helpers
//

function initNode(idx: number, type: string): Array<string> {
  const pvs = Array<string>();
  pvs.push(`Node: E:${FIXED_CSV_TABLE}->E${idx.toString()}`);
  pvs.push(`typeOf: dcs:${type}`);
  return pvs;
}

function getColPV(prop: string, col: string): string {
  return `${prop}: C:${FIXED_CSV_TABLE}->${col}`;
}

function getEntPV(prop: string, idx: number): string {
  return `${prop}: E:${FIXED_CSV_TABLE}->E${idx.toString()}`;
}

function getConstPV(prop: string, val: string): string {
  // Constants are references except when it is a date or name.
  if (prop === "observationDate" || prop === "name") {
    return `${prop}: "${val}"`;
  } else {
    return `${prop}: dcid:${val}`;
  }
}

function getPlaceType(colIdx: number, mval: MappingVal): string {
  let placeType = PLACE_TYPE;
  if (mval.placeType != null && colIdx in mval.placeType) {
    placeType = mval.placeType[colIdx].dcid;
  }
  return placeType;
}

/**
 * Generates the tmcf file given the correct mappings.
 * ASSUMES: checkMappings() returns success on |mappings|
 *
 * @param {mappings} finalized CSV mappings
 * @returns {string} generated TMCF string
 */
export function generateTMCF(mappings: Mapping): string {
  const commonPVs = Array<string>();
  let colHdrThing: MappedThing = null;
  const placeNodes = Array<Array<string>>();
  let nodeIdx = 0;
  const colConstPvs: { [colIdx: number]: Array<string> } = {};

  // Do one pass over the mappings building the constant PVs that are specific
  // to each column.
  mappings.forEach((mval: MappingVal, mthing: MappedThing) => {
    if (mval.type === MappingType.COLUMN_CONSTANT) {
      const mappedProp = MAPPED_THING_TO_SVOBS_PROP.get(mthing);
      Object.entries(mval.columnConstants).forEach(([colIdx, constant]) => {
        if (!(colIdx in colConstPvs)) {
          colConstPvs[colIdx] = [];
        }
        colConstPvs[colIdx].push(getConstPV(mappedProp, constant));
      });
    }
  });

  // Do one pass over the mappings building the common PVs in all TMCF nodes.
  // Everything other than COLUMN_HEADER mappings get repeated in every node.
  mappings.forEach((mval: MappingVal, mthing: MappedThing) => {
    const mappedProp = MAPPED_THING_TO_SVOBS_PROP.get(mthing);
    if (mval.type === MappingType.FILE_CONSTANT) {
      // Constants are references except when it is a date.
      // NOTE: we cannot have PLACE here.
      commonPVs.push(getConstPV(mappedProp, mval.fileConstant));
    } else if (mval.type === MappingType.COLUMN) {
      if (mthing === MappedThing.PLACE) {
        const placeProperty = mval.placeProperty[mval.column.columnIdx].dcid;
        if (placeProperty === DCID_PROP) {
          // Place with DCID property can be a column ref.
          commonPVs.push(getColPV(mappedProp, mval.column.id));
        } else {
          // For place with non-DCID property, we should introduce a place node,
          // and use entity reference.
          const node = initNode(
            nodeIdx,
            getPlaceType(mval.column.columnIdx, mval)
          );
          node.push(getColPV(placeProperty, mval.column.id));
          placeNodes.push(node);
          nodeIdx++;

          // Reference the place node.
          commonPVs.push(getEntPV(mappedProp, nodeIdx - 1));
        }
      } else {
        // For non-place types, column directly contains the corresponding values.
        commonPVs.push(getColPV(mappedProp, mval.column.id));
        if (
          mthing === MappedThing.VALUE &&
          mval.column.columnIdx in colConstPvs
        ) {
          commonPVs.push(...colConstPvs[mval.column.columnIdx]);
        }
      }
    } else if (mval.type === MappingType.COLUMN_HEADER) {
      // Remember which mapped thing has the column header for next pass.
      // Validation has ensured there can be no more than one.
      colHdrThing = mthing;
    }
  });

  // Populate the observation nodes now.
  let obsNodes = Array<Array<string>>();
  if (colHdrThing != null) {
    const mappedProp = MAPPED_THING_TO_SVOBS_PROP.get(colHdrThing);
    const mval = mappings.get(colHdrThing);

    // Build one node per header entry in COLUMN_HEADER.
    mval.headers.forEach((hdr) => {
      let hasPlaceRef = false;
      const placeProperty =
        colHdrThing === MappedThing.PLACE
          ? mval.placeProperty[hdr.columnIdx].dcid
          : "";
      if (colHdrThing === MappedThing.PLACE && placeProperty !== DCID_PROP) {
        hasPlaceRef = true;
        // For place with non-DCID property, we should introduce a place node.
        const node = initNode(nodeIdx, getPlaceType(hdr.columnIdx, mval));
        node.push(getConstPV(placeProperty, hdr.header));
        placeNodes.push(node);
        nodeIdx++;
      }
      const node = initNode(nodeIdx, SVOBS_TYPE);
      // Each column contains numerical values of SVObs.
      node.push(getColPV(VALUE_PROP, hdr.id));
      if (hasPlaceRef) {
        // Reference place node created above.
        node.push(getEntPV(mappedProp, nodeIdx - 1));
      } else {
        node.push(getConstPV(mappedProp, hdr.header));
      }
      // Add the constant PVs for this column
      if (hdr.columnIdx in colConstPvs) {
        node.push(...colConstPvs[hdr.columnIdx]);
      }
      obsNodes.push(node);
      nodeIdx++;
    });
  } else {
    // There is only one node in this case.
    obsNodes.push(initNode(nodeIdx, SVOBS_TYPE));
    nodeIdx++;
  }

  // Add the common PVs to Obs TMCF nodes.
  obsNodes = obsNodes.map((val) => val.concat(commonPVs));

  // Build newline delimited strings.
  const nodeStrings = Array<string>();
  [placeNodes, obsNodes].forEach((array) => {
    array.forEach((pvs) => {
      nodeStrings.push(pvs.join("\n"));
      nodeStrings.push("");
    });
  });
  return nodeStrings.join("\n");
}
