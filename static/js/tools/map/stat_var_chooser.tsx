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

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { getStatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchyType } from "../../shared/types";
import { DrawerToggle } from "../../stat_var_hierarchy/drawer_toggle";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import {
  Context,
  DisplayOptionsWrapper,
  PlaceInfoWrapper,
  StatVarWrapper,
} from "./context";
import {
  DEFAULT_DENOM,
  DEFAULT_DISPLAY_OPTIONS,
  getMapPointsPlaceType,
} from "./util";

const SAMPLE_SIZE = 3;

export function StatVarChooser(): JSX.Element {
  const { statVar, placeInfo, display } = useContext(Context);
  const [samplePlaces, setSamplePlaces] = useState(
    _.sampleSize(placeInfo.value.enclosedPlaces, SAMPLE_SIZE)
  );
  useEffect(() => {
    setSamplePlaces(_.sampleSize(placeInfo.value.enclosedPlaces, SAMPLE_SIZE));
  }, [placeInfo.value.enclosedPlaces]);
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
  }, [statVar.value]);
  return (
    <div className="explore-menu-container" id="explore">
      <DrawerToggle
        collapseElemId="explore"
        visibleElemId="stat-var-hierarchy-section"
      />
      <StatVarHierarchy
        type={StatVarHierarchyType.MAP}
        places={samplePlaces}
        selectedSVs={[statVar.value.dcid]}
        selectSV={(svDcid) => {
          selectStatVar(statVar, display, placeInfo, svDcid);
        }}
        searchLabel="Statistical Variables"
      />
    </div>
  );
}

function selectStatVar(
  statVar: StatVarWrapper,
  displayOptions: DisplayOptionsWrapper,
  placeInfo: PlaceInfoWrapper,
  dcid: string
): void {
  displayOptions.set(DEFAULT_DISPLAY_OPTIONS);
  placeInfo.setMapPointsPlaceType(getMapPointsPlaceType(dcid));
  statVar.set({
    date: "",
    dcid,
    denom: DEFAULT_DENOM,
    info: null,
    perCapita: false,
  });
}
