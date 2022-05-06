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
import React, { useEffect, useState } from "react";

import { getStatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchyType } from "../../shared/types";
import {
  getEnclosedPlacesPromise,
  getSamplePlaces,
} from "../../utils/place_utils";
import { StatVarWidget } from "../shared/stat_var_widget";
import { StatVarInfo } from "../timeline/chart_region";

interface StatVarChooserProps {
  statVars: string[];
  placeDcid: string;
  enclosedPlaceType: string;
  onStatVarSelected: (sv: string, svInfo: StatVarInfo) => void;
  onStatVarRemoved: (sv: string) => void;
  openSvHierarchyModalCallback: () => void;
  openSvHierarchyModal: boolean;
}

export function StatVarChooser(props: StatVarChooserProps): JSX.Element {
  const [samplePlaces, setSamplePlaces] = useState([]);

  useEffect(() => {
    if (!props.placeDcid || !props.enclosedPlaceType) {
      return;
    }
    getEnclosedPlacesPromise(props.placeDcid, props.enclosedPlaceType)
      .then((enclosedPlaces) => {
        const samplePlaces = getSamplePlaces(
          props.placeDcid,
          props.enclosedPlaceType,
          enclosedPlaces
        );
        setSamplePlaces(samplePlaces);
      })
      .catch(() => {
        setSamplePlaces([]);
      });
  }, [props.placeDcid, props.enclosedPlaceType]);

  const svHierarchyProps = {
    type: StatVarHierarchyType.TIMELINE,
    places: samplePlaces,
    selectedSVs: props.statVars,
    selectSV: (sv) => selectSV(sv, props.onStatVarSelected),
    deselectSV: (sv) => props.onStatVarRemoved(sv),
  };

  return (
    <StatVarWidget
      openSvHierarchyModal={props.openSvHierarchyModal}
      openSvHierarchyModalCallback={props.openSvHierarchyModalCallback}
      svHierarchyProps={svHierarchyProps}
      collapsible={false}
    />
  );
}

function selectSV(
  selectedSV: string,
  onStatVarSelected: (sv: string, svInfo: StatVarInfo) => void
): void {
  getStatVarInfo([selectedSV])
    .then((svInfo) => {
      onStatVarSelected(selectedSV, svInfo[selectedSV] || {});
    })
    .catch(() => {
      onStatVarSelected(selectedSV, {});
    });
}
