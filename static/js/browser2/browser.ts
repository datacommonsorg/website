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

import { BrowserPage, nodeTypeEnum } from "./browser_page";
import axios from "axios";
import { removeLoadingMessage } from "./shared";

window.onload = () => {
  const dcid = document.getElementById("node").dataset.dcid;
  const nodeName = document.getElementById("node").dataset.nn;
  const urlParams = new URLSearchParams(window.location.search);
  const statVarId = urlParams.get("statVar") || "";
  axios
    .get(`/api/browser/propvals/typeOf/${dcid}`)
    .then((resp) => {
      const values = resp.data.values;
      const types = values.out ? values.out : [];
      const listOfTypes = types.map((type) => type.dcid);
      ReactDOM.render(
        React.createElement(BrowserPage, {
          dcid,
          nodeType: getNodeType(listOfTypes, statVarId),
          nodeName,
          statVarId,
        }),
        document.getElementById("node")
      );
    })
    .catch(() => removeLoadingMessage());
};

function getNodeType(listOfTypes, statVarId): string {
  if (!_.isEmpty(statVarId)) {
    return nodeTypeEnum.PLACE_STAT_VAR;
  }
  let type = "";
  if (listOfTypes.length > 0) {
    type = listOfTypes[0];
  }
  for (const targetType of ["State", "County", "City"]) {
    if (targetType in listOfTypes) {
      type = targetType;
      break;
    }
  }
  if (
    type === nodeTypeEnum.CITY ||
    type === nodeTypeEnum.CENSUS_ZIPCODE_TABULATION_AREA
  ) {
    return type;
  }
  return nodeTypeEnum.GENERAL;
}
