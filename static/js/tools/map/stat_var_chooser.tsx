/**
 * Copyright 2021 Google LLC
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
 * Component to pick statvar for map.
 */

import React, { useContext, useEffect } from "react";
import _ from "lodash";
import { StatVarHierarchyType } from "../../shared/types";
import { Context, StatVarWrapper } from "./context";
import { getStatVarInfo } from "../statvar_menu/util";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";

const SAMPLE_SIZE = 3;

export function StatVarChooser(): JSX.Element {
  const { statVar, placeInfo } = useContext(Context);
  useEffect(() => {
    if (statVar.value.dcid && _.isNull(statVar.value.info)) {
      getStatVarInfo([statVar.value.dcid])
        .then((info) => {
          const statVarInfo =
            statVar.value.dcid in info ? info[statVar.value.dcid] : {};
          statVar.setInfo(statVarInfo);
        })
        .catch(() => {
          statVar.setInfo({});
        });
    }
  });
  return (
    <div className="explore-menu-container" id="explore">
      <StatVarHierarchy
        type={StatVarHierarchyType.MAP}
        places={_.sampleSize(placeInfo.value.enclosedPlaces, SAMPLE_SIZE)}
        selectedSVs={[statVar.value.dcid]}
        selectSV={(svDcid) => {
          selectStatVar(statVar, svDcid);
        }}
        searchLabel="Select variables:"
      />
    </div>
  );
}

function selectStatVar(statVar: StatVarWrapper, dcid: string): void {
  getStatVarInfo([dcid])
    .then((info) => {
      statVar.set({
        dcid,
        perCapita: statVar.value.perCapita,
        info: info[dcid],
      });
    })
    .catch(() => {
      statVar.set({
        dcid,
        perCapita: statVar.value.perCapita,
        info: {},
      });
    });
}
