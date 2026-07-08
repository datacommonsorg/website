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
 * Component to pick statvar for download tool.
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
  statVars: Record<string, StatVarInfo>;
  placeDcid: string;
  enclosedPlaceType: string;
  onStatVarSelected: (sv: string, svInfo: StatVarInfo) => void;
  onStatVarRemoved: (sv: string) => void;
  openSvHierarchyModalCallback: () => void;
  openSvHierarchyModal: boolean;
}

export function StatVarChooser(props: StatVarChooserProps): JSX.Element {
  const [samplePlaces, setSamplePlaces] = useState([]);
  const [statVarWidgetIsCollapsed, setStatVarWidgetIsCollapsed] =
    useState(true);

  useEffect(() => {
    // Once a variable is selected, keep the widget open regardless of place
    // type churn (e.g. place type list reloading empty while it refetches).
    if (!_.isEmpty(props.statVars)) {
      setStatVarWidgetIsCollapsed(false);
      return;
    }
    setStatVarWidgetIsCollapsed(!props.enclosedPlaceType);
  }, [props.enclosedPlaceType, props.statVars]);

  useEffect(() => {
    if (!props.placeDcid || !props.enclosedPlaceType) {
      setSamplePlaces([]);
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

  return (
    <StatVarWidget
      openSvHierarchyModal={props.openSvHierarchyModal}
      openSvHierarchyModalCallback={props.openSvHierarchyModalCallback}
      collapsible={true}
      svHierarchyType={StatVarHierarchyType.DOWNLOAD}
      sampleEntities={samplePlaces}
      deselectSVs={(svList: string[]): void =>
        svList.forEach((sv) => {
          props.onStatVarRemoved(sv);
        })
      }
      selectedSVs={props.statVars}
      selectSV={(sv): void => selectSV(sv)}
      isCollapsedOverride={statVarWidgetIsCollapsed}
      setIsCollapsedOverride={setStatVarWidgetIsCollapsed}
    />
  );

  function selectSV(sv: string): void {
    getStatVarInfo([sv])
      .then((svInfo) => {
        props.onStatVarSelected(sv, svInfo[sv] || {});
      })
      .catch(() => {
        props.onStatVarSelected(sv, {});
      });
  }
}
