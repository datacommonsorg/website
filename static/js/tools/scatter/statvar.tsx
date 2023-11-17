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

/**
 * Wrapper around the statvar menu. We only want the user to choose two statvars.
 * Pops up a modal if three statvars are selected and forces the user to choose
 * two of the three.
 */

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Container,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "reactstrap";

import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchyType } from "../../shared/types";
import { getSamplePlaces } from "../../utils/place_utils";
import { StatVarWidget } from "../shared/stat_var_widget";
import { AxisWrapper, Context } from "./context";

interface StatVar {
  // Always contains a single statvar.
  info: StatVarInfo;
  dcid: string;
}

const emptyStatVar: StatVar = Object.freeze({
  info: {},
  dcid: "",
});

interface ModalSelected {
  x: boolean;
  y: boolean;
}

const defaultModalSelected: ModalSelected = Object.freeze({
  x: true,
  y: false,
});

const NUM_ENTITIES_EXISTENCE = 10;

interface StatVarChooserProps {
  openSvHierarchyModalCallback: () => void;
  openSvHierarchyModal: boolean;
}

export function StatVarChooser(props: StatVarChooserProps): JSX.Element {
  const { x, y, place } = useContext(Context);

  // Temporary variable for storing an extra statvar.
  const [thirdStatVar, setThirdStatVar] = useState(emptyStatVar);
  // Records which two of the three statvars are wanted if a third statvar is selected.
  const [modalSelected, setModalSelected] = useState(defaultModalSelected);
  const [modalOpen, setModalOpen] = useState(false);
  const [samplePlaces, setSamplePlaces] = useState(
    getSamplePlaces(
      place.value.enclosingPlace.dcid,
      place.value.enclosedPlaceType,
      place.value.enclosedPlaces
    )
  );
  useEffect(() => {
    const samplePlaces = getSamplePlaces(
      place.value.enclosingPlace.dcid,
      place.value.enclosedPlaceType,
      place.value.enclosedPlaces
    );
    setSamplePlaces(samplePlaces);
  }, [place.value.enclosedPlaces]);
  const closeModal = () => {
    setThirdStatVar(emptyStatVar);
    setModalOpen(false);
  };

  useEffect(() => {
    const statVarsToGetInfo = [];
    if (!_.isEmpty(x.value.statVarDcid) && _.isNull(x.value.statVarInfo)) {
      statVarsToGetInfo.push(x.value.statVarDcid);
    }
    if (!_.isEmpty(y.value.statVarDcid) && _.isNull(y.value.statVarInfo)) {
      statVarsToGetInfo.push(y.value.statVarDcid);
    }
    if (_.isEmpty(statVarsToGetInfo)) {
      return;
    }
    getStatVarInfo(statVarsToGetInfo)
      .then((info) => {
        statVarsToGetInfo.forEach((sv) => {
          const svInfo = sv in info ? info[sv] : {};
          if (sv === x.value.statVarDcid) {
            x.setStatVarInfo(svInfo);
          } else {
            y.setStatVarInfo(svInfo);
          }
        });
      })
      .catch(() => {
        if (statVarsToGetInfo.indexOf(x.value.statVarDcid) > -1) {
          x.setStatVarInfo({});
        }
        if (statVarsToGetInfo.indexOf(y.value.statVarDcid) > -1) {
          y.setStatVarInfo({});
        }
      });
  }, [x.value, y.value]);

  let yTitle = y.value.statVarDcid;
  if (y.value.statVarInfo && y.value.statVarInfo.title) {
    yTitle = y.value.statVarInfo.title;
  }
  let xTitle = x.value.statVarDcid;
  if (x.value.statVarInfo && x.value.statVarInfo.title) {
    xTitle = x.value.statVarInfo.title;
  }

  const selectedSvs = {};
  if (!_.isEmpty(x.value.statVarDcid)) {
    selectedSvs[x.value.statVarDcid] = x.value.statVarInfo;
  }
  if (!_.isEmpty(y.value.statVarDcid)) {
    selectedSvs[y.value.statVarDcid] = y.value.statVarInfo;
  }
  if (!_.isEmpty(thirdStatVar.dcid)) {
    selectedSvs[thirdStatVar.dcid] = thirdStatVar.info;
  }

  return (
    <>
      <StatVarWidget
        openSvHierarchyModal={props.openSvHierarchyModal}
        openSvHierarchyModalCallback={props.openSvHierarchyModalCallback}
        collapsible={true}
        svHierarchyType={StatVarHierarchyType.SCATTER}
        sampleEntities={samplePlaces}
        deselectSVs={(svList: string[]) =>
          svList.forEach((sv) => {
            removeStatVar(x, y, sv);
          })
        }
        selectedSVs={selectedSvs}
        selectSV={(sv) => addStatVar(x, y, sv, setThirdStatVar, setModalOpen)}
        numEntitiesExistence={Math.min(
          NUM_ENTITIES_EXISTENCE,
          samplePlaces.length
        )}
      />
      {/* Modal for selecting 2 stat vars when a third is selected */}
      <Modal isOpen={modalOpen} backdrop="static" id="statvar-modal">
        <ModalHeader toggle={closeModal}>
          Only Two Statistical Variables Supported
        </ModalHeader>
        <ModalBody>
          <Container>
            <div>
              You selected:{" "}
              <b>{thirdStatVar.info.title || thirdStatVar.dcid}</b>
            </div>
            <div className="radio-selection-label">
              Please choose 1 more statistical variable to keep:
            </div>
            <div className="radio-selection-section">
              <FormGroup radio="true" row>
                <Label radio="true">
                  <Input
                    id="x-radio-button"
                    type="radio"
                    name="statvar"
                    defaultChecked={modalSelected.x}
                    onClick={() => setModalSelected({ x: true, y: false })}
                  />
                  {xTitle}
                </Label>
              </FormGroup>
              <FormGroup radio="true" row>
                <Label radio="true">
                  <Input
                    id="y-radio-button"
                    type="radio"
                    name="statvar"
                    defaultChecked={modalSelected.y}
                    onClick={() => setModalSelected({ x: false, y: true })}
                  />
                  {yTitle}
                </Label>
              </FormGroup>
            </div>
          </Container>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={() =>
              confirmStatVars(
                x,
                y,
                thirdStatVar,
                setThirdStatVar,
                modalSelected,
                setModalSelected,
                setModalOpen
              )
            }
          >
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

/**
 * Adds a statvar.
 * If either x or y axis does not yet have a statvar selected, assign the new
 * statvar to that axis. Otherwise, set the new statvar as the third, extra statvar.
 * @param x
 * @param y
 * @param statVar
 * @param nodePath
 * @param denominators
 * @param setThirdStatVar
 */
function addStatVar(
  x: AxisWrapper,
  y: AxisWrapper,
  svDcid: string,
  setThirdStatVar: (statVar: StatVar) => void,
  setModalOpen: (open: boolean) => void
) {
  getStatVarInfo([svDcid])
    .then((info) => {
      const svInfo = info[svDcid] ? info[svDcid] : {};
      addStatVarHelper(x, y, svInfo, svDcid, setThirdStatVar, setModalOpen);
    })
    .catch(() => {
      addStatVarHelper(x, y, {}, svDcid, setThirdStatVar, setModalOpen);
    });
}

/** Helper function to update the right axis with the new selected stat var.
 * If either x or y axis does not yet have a statvar selected, assign the new
 * statvar to that axis. Otherwise, set the new statvar as the third, extra
 * statvar.
 */
function addStatVarHelper(
  x: AxisWrapper,
  y: AxisWrapper,
  svInfo: StatVarInfo,
  svDcid: string,
  setThirdStatVar: (statVar: StatVar) => void,
  setModalOpen: (open: boolean) => void
): void {
  if (_.isEmpty(x.value.statVarDcid)) {
    x.set({
      statVarInfo: svInfo,
      statVarDcid: svDcid,
      log: x.value.log,
      perCapita: x.value.perCapita,
      date: x.value.date,
      metahash: "",
      denom: x.value.denom || DEFAULT_POPULATION_DCID,
    });
  } else if (_.isEmpty(y.value.statVarDcid)) {
    y.set({
      statVarInfo: svInfo,
      statVarDcid: svDcid,
      log: y.value.log,
      perCapita: y.value.perCapita,
      date: y.value.date,
      metahash: "",
      denom: y.value.denom || DEFAULT_POPULATION_DCID,
    });
  } else {
    setThirdStatVar({ info: svInfo, dcid: svDcid });
    setModalOpen(true);
  }
}

/**
 * Removes a selected statvar.
 * @param x
 * @param y
 * @param statVar
 * @param nodePath
 */
function removeStatVar(x: AxisWrapper, y: AxisWrapper, svDcid: string) {
  const statVarX = x.value.statVarDcid;
  const statVarY = y.value.statVarDcid;
  if (statVarX === svDcid) {
    x.unsetStatVarDcid();
  } else if (statVarY === svDcid) {
    y.unsetStatVarDcid();
  }
}

/**
 * Confirms the statvar selections in the modal.
 * No-op if all three statvars are selected.
 * Clears the third, extra statvar and the modal selections.
 * @param x
 * @param y
 * @param thirdStatVar
 * @param setThirdStatVar
 * @param modalSelected
 * @param setModalSelected
 */
function confirmStatVars(
  x: AxisWrapper,
  y: AxisWrapper,
  thirdStatVar: StatVar,
  setThirdStatVar: (statVar: StatVar) => void,
  modalSelected: ModalSelected,
  setModalSelected: (modalSelected: ModalSelected) => void,
  setModalOpened: (open: boolean) => void
): void {
  if (modalSelected.y) {
    x.set({
      ...x.value,
      statVarInfo: thirdStatVar.info,
      statVarDcid: thirdStatVar.dcid,
    });
  } else if (modalSelected.x) {
    y.set({
      ...y.value,
      statVarInfo: thirdStatVar.info,
      statVarDcid: thirdStatVar.dcid,
    });
  }
  setThirdStatVar(emptyStatVar);
  setModalSelected(defaultModalSelected);
  setModalOpened(false);
}
