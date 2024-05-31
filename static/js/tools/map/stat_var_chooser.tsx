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

import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { getStatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchyType } from "../../shared/types";
import {
  getEnclosedPlacesPromise,
  getSamplePlaces,
} from "../../utils/place_utils";
import { StatVarWidget } from "../shared/stat_var_widget";
import {
  Context,
  DateWrapper,
  DisplayOptionsWrapper,
  PlaceInfoWrapper,
  StatVarWrapper,
} from "./context";
import { DEFAULT_DISPLAY_OPTIONS, getMapPointPlaceType } from "./util";

interface StatVarChooserProps {
  openSvHierarchyModalCallback: () => void;
  openSvHierarchyModal: boolean;
}

export function StatVarChooser(props: StatVarChooserProps): JSX.Element {
  const { dateCtx, statVar, placeInfo, display } = useContext(Context);
  const [samplePlaces, setSamplePlaces] = useState([]);

  useEffect(() => {
    const enclosingPlaceDcid = placeInfo.value.enclosingPlace.dcid;
    const enclosedPlaceType = placeInfo.value.enclosedPlaceType;
    if (_.isEmpty(enclosingPlaceDcid) || _.isEmpty(enclosedPlaceType)) {
      setSamplePlaces([]);
      return;
    }
    getEnclosedPlacesPromise(enclosingPlaceDcid, enclosedPlaceType).then(
      (enclosedPlaces) => {
        const samplePlaces = getSamplePlaces(
          enclosingPlaceDcid,
          enclosedPlaceType,
          enclosedPlaces
        );
        setSamplePlaces(samplePlaces);
      }
    );
  }, [placeInfo.value.enclosingPlace, placeInfo.value.enclosedPlaceType]);

  useEffect(() => {
    const svWithInfo = _.isNull(statVar.value.info)
      ? []
      : Object.keys(statVar.value.info);
    const svDcids = [statVar.value.dcid, statVar.value.mapPointSv].filter(
      (svDcid) => !_.isEmpty(svDcid)
    );
    if (_.difference(svDcids, svWithInfo).length > 0) {
      getStatVarInfo(svDcids)
        .then((info) => {
          const svInfo = {};
          svDcids.forEach(
            (svDcid) => (svInfo[svDcid] = svDcid in info ? info[svDcid] : {})
          );
          statVar.setInfo(svInfo);
        })
        .catch(() => {
          const emptyInfo = {};
          svDcids.forEach((svDcid) => (emptyInfo[svDcid] = {}));
          statVar.setInfo(emptyInfo);
        });
    }
  }, [statVar.value]);

  const deselectSVs = (svList: string[]) => {
    if (!_.isEmpty(svList)) {
      // map tool can only have one stat var selected at a time so if a stat var
      // is deselected, just set the selected stat var to empty.
      selectStatVar(dateCtx, statVar, display, placeInfo, "");
    }
  };
  const selectedSVs = !_.isEmpty(statVar.value.dcid)
    ? { [statVar.value.dcid]: statVar.value.info }
    : {};
  return (
    <StatVarWidget
      openSvHierarchyModal={props.openSvHierarchyModal}
      openSvHierarchyModalCallback={props.openSvHierarchyModalCallback}
      collapsible={true}
      svHierarchyType={StatVarHierarchyType.MAP}
      sampleEntities={samplePlaces}
      deselectSVs={deselectSVs}
      selectedSVs={selectedSVs}
      selectSV={(svDcid) =>
        selectStatVar(dateCtx, statVar, display, placeInfo, svDcid)
      }
    />
  );
}

function selectStatVar(
  dateCtx: DateWrapper,
  statVar: StatVarWrapper,
  displayOptions: DisplayOptionsWrapper,
  placeInfo: PlaceInfoWrapper,
  dcid: string
): void {
  displayOptions.set(DEFAULT_DISPLAY_OPTIONS);
  placeInfo.setMapPointPlaceType(getMapPointPlaceType(dcid));
  statVar.set({
    dcid,
    denom: DEFAULT_POPULATION_DCID,
    info: null,
    perCapita: false,
    mapPointSv: "",
    metahash: "",
  });
  dateCtx.set("");
}
