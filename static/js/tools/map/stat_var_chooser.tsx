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
import React, { createRef, useContext, useEffect, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { getStatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchyType } from "../../shared/types";
import { DrawerToggle } from "../../stat_var_hierarchy/drawer_toggle";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import {
  getEnclosedPlacesPromise,
  getSamplePlaces,
} from "../../utils/place_utils";
import {
  Context,
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
  const { statVar, placeInfo, display } = useContext(Context);
  const [samplePlaces, setSamplePlaces] = useState([]);
  // Set up refs for sv widget modal. Widget is tied to the LHS menu but
  // reattached to the modal when it is opened on small screens.
  const svHierarchyModalRef = createRef<HTMLDivElement>();
  const svHierarchyContainerRef = createRef<HTMLDivElement>();

  useEffect(() => {
    const enclosingPlaceDcid = placeInfo.value.enclosingPlace.dcid;
    const enclosedPlaceType = placeInfo.value.enclosedPlaceType;
    if (_.isEmpty(enclosingPlaceDcid) || _.isEmpty(enclosedPlaceType)) {
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

  function onSvModalOpened() {
    if (svHierarchyModalRef.current && svHierarchyContainerRef.current) {
      svHierarchyModalRef.current.appendChild(svHierarchyContainerRef.current);
    }
  }

  function onSvModalClosed() {
    document
      .getElementById("explore")
      .appendChild(svHierarchyContainerRef.current);
  }

  return (
    <>
      <div className="d-none d-lg-flex explore-menu-container" id="explore">
        <DrawerToggle
          collapseElemId="explore"
          visibleElemId="stat-var-hierarchy-section"
        />
        <div ref={svHierarchyContainerRef}>
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
      </div>
      <Modal
        isOpen={props.openSvHierarchyModal}
        toggle={props.openSvHierarchyModalCallback}
        className="modal-dialog-centered modal-lg"
        contentClassName="modal-sv-widget"
        onOpened={onSvModalOpened}
        onClosed={onSvModalClosed}
        scrollable={true}
      >
        <ModalHeader toggle={props.openSvHierarchyModalCallback}>
          Select Variables
        </ModalHeader>
        <ModalBody>
          <div ref={svHierarchyModalRef}></div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={props.openSvHierarchyModalCallback}>
            Done
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

function selectStatVar(
  statVar: StatVarWrapper,
  displayOptions: DisplayOptionsWrapper,
  placeInfo: PlaceInfoWrapper,
  dcid: string
): void {
  displayOptions.set(DEFAULT_DISPLAY_OPTIONS);
  placeInfo.setMapPointPlaceType(getMapPointPlaceType(dcid));
  statVar.set({
    date: "",
    dcid,
    denom: "",
    info: null,
    perCapita: false,
    mapPointSv: "",
    metahash: "",
  });
}
