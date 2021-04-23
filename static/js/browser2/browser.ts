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

import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";

import { BrowserPage } from "./browser_page";
import axios from "axios";
import { getPageDisplayType, PageDisplayType } from "./types";

const TYPE_OF_UNKNOWN = "Unknown";
const TYPE_OF_STAT_VAR = "StatisticalVariable";
const TYPE_OF_OBSERVATION = "Observation";

window.onload = () => {
  const dcid = document.getElementById("node").dataset.dcid;
  const nodeName = document.getElementById("node").dataset.nn;
  const urlParams = new URLSearchParams(window.location.search);
  const statVarId = urlParams.get("statVar") || "";
  if (!_.isEmpty(statVarId)) {
    document.title = `${statVarId} - ${document.title}`;
  }
  const typesPromise = axios
    .get(`/api/browser/propvals/typeOf/${dcid}`)
    .then((resp) => resp.data);
  const statVarsPromise = axios
    .get(`/api/place/statsvars/${dcid}`)
    .then((resp) => resp.data);
  Promise.all([typesPromise, statVarsPromise])
    .then(([typesData, statVarsData]) => {
      const types = typesData.values.out ? typesData.values.out : [];
      const listOfTypes = types.map((type) => type.dcid);
      const nodeType = getNodeType(dcid, listOfTypes, statVarId);
      const pageDisplayType = getPageDisplayType(listOfTypes, statVarId);
      ReactDOM.render(
        React.createElement(BrowserPage, {
          dcid,
          nodeName,
          nodeType,
          pageDisplayType,
          statVarId,
          shouldShowStatVarHierarchy:
            !_.isEmpty(statVarsData) && _.isEmpty(statVarId),
        }),
        document.getElementById("node")
      );
    })
    .catch(() => {
      ReactDOM.render(
        React.createElement(BrowserPage, {
          dcid,
          nodeName,
          nodeType: getNodeType(dcid, [], statVarId),
          pageDisplayType: PageDisplayType.GENERAL,
          statVarId,
          shouldShowStatVarHierarchy: false,
        }),
        document.getElementById("node")
      );
    });
};

function getNodeType(
  dcid: string,
  listOfTypes: string[],
  statVarId: string
): string {
  if (statVarId !== "") {
    return TYPE_OF_STAT_VAR;
  }
  if (dcid.startsWith("dc/o/")) {
    return TYPE_OF_OBSERVATION;
  }
  return _.isEmpty(listOfTypes) ? TYPE_OF_UNKNOWN : listOfTypes[0];
}
