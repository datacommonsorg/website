/**
 * Copyright 2020 Google LLC
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

import axios from "axios";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import { PropertyValue } from "../shared/types";
import { BrowserPage } from "./page";
import { getPageDisplayType, PageDisplayType } from "./types";

const TYPE_OF_UNKNOWN = "Unknown";
const TYPE_OF_STAT_VAR = "StatisticalVariable";
const TYPE_OF_OBSERVATION = "StatVarObservation";

window.onload = () => {
  const dcid = document.getElementById("node").dataset.dcid;
  const nodeName = document.getElementById("node").dataset.nn;
  const urlParams = new URLSearchParams(window.location.search);
  const statVarId = urlParams.get("statVar") || "";
  if (!_.isEmpty(statVarId)) {
    document.title = `${statVarId} - ${document.title}`;
  }
  const typesPromise = axios
    .get<{ [key: string]: PropertyValue[] }>(
      `/api/node/propvals/out?prop=typeOf&dcids=${dcid}`
    )
    .then((resp) => resp.data);
  const numStatVarsPromise = axios
    .get(`/api/browser/num_stat_vars/${dcid}`)
    .then((resp) => resp.data)
    .catch(() => {
      return 0;
    });
  Promise.all([typesPromise, numStatVarsPromise])
    .then(([typesData, numStatVars]) => {
      const types = typesData[dcid] || [];
      const listOfTypes = types.map((type) => type.dcid);
      const nodeTypes = getNodeTypes(dcid, listOfTypes, statVarId);
      const pageDisplayType = getPageDisplayType(listOfTypes, statVarId);
      ReactDOM.render(
        React.createElement(BrowserPage, {
          dcid,
          nodeName,
          nodeTypes,
          pageDisplayType,
          shouldShowStatVarHierarchy: numStatVars > 0 && _.isEmpty(statVarId),
          statVarId,
        }),
        document.getElementById("node")
      );
    })
    .catch(() => {
      ReactDOM.render(
        React.createElement(BrowserPage, {
          dcid,
          nodeName,
          nodeTypes: getNodeTypes(dcid, [], statVarId),
          pageDisplayType: PageDisplayType.GENERAL,
          shouldShowStatVarHierarchy: false,
          statVarId,
        }),
        document.getElementById("node")
      );
    });
};

function getNodeTypes(
  dcid: string,
  listOfTypes: string[],
  statVarId: string
): string[] {
  if (statVarId !== "") {
    return [TYPE_OF_STAT_VAR];
  }
  if (dcid.startsWith("dc/o/")) {
    return [TYPE_OF_OBSERVATION];
  }
  return _.isEmpty(listOfTypes) ? [TYPE_OF_UNKNOWN] : listOfTypes;
}
