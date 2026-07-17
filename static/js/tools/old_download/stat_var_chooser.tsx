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
import React, { useEffect, useRef, useState } from "react";
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

const EMPTY_SV_AND_INFO: { dcid: string; info: StatVarInfo } = {
  dcid: "",
  info: {},
};
const MAX_SV = 5;

export function StatVarChooser(props: StatVarChooserProps): JSX.Element {
  const [samplePlaces, setSamplePlaces] = useState([]);
  // extraStatVar holds a stat var that is selected after the max number of
  // selected stat vars has been reached. This stat var will either be removed
  // or used to replace another selected stat var.
  const [extraStatVar, setExtraStatVar] = useState(EMPTY_SV_AND_INFO);
  const [modalSelection, setModalSelection] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const modalSvOrder = useRef(Object.keys(props.statVars));

  useEffect(() => {
    modalSvOrder.current = Object.keys(props.statVars);
  }, [props.statVars]);

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

  const selectedSVs = { ...props.statVars };
  // although we don't propagate the extra stat var selection to the rest of the
  // tool, we do need to pass it to the widget because the StatVarHierarchy has
  // it showing as selected.
  if (!_.isEmpty(extraStatVar.dcid)) {
    selectedSVs[extraStatVar.dcid] = extraStatVar.info;
  }

  return (
    <>
      <StatVarWidget
        openSvHierarchyModal={props.openSvHierarchyModal}
        openSvHierarchyModalCallback={props.openSvHierarchyModalCallback}
        collapsible={false}
        svHierarchyType={StatVarHierarchyType.DOWNLOAD}
        sampleEntities={samplePlaces}
        deselectSVs={(svList: string[]): void =>
          svList.forEach((sv) => {
            props.onStatVarRemoved(sv);
          })
        }
        selectedSVs={selectedSVs}
        selectSV={(sv): void => selectSV(sv)}
      />
      {/* Modal for selecting stat var to replace when too many are selected */}
      <Modal isOpen={modalOpen} backdrop="static" id="statvar-modal">
        <ModalHeader toggle={closeModal}>
          Only 5 Statistical Variables Supported
        </ModalHeader>
        <ModalBody>
          <Container>
            <div>
              You selected:{" "}
              <b>{extraStatVar.info.title || extraStatVar.dcid}</b>
            </div>
            <div className="radio-selection-label">
              Please choose a statistical variable to replace:
            </div>
            <div className="radio-selection-section">
              {modalSvOrder.current.map((sv, idx) => {
                return (
                  <FormGroup key={sv} radio="true" row>
                    <Label radio="true">
                      <Input
                        type="radio"
                        name="statvar"
                        defaultChecked={
                          (_.isEmpty(modalSelection) && idx === 0) ||
                          modalSelection === sv
                        }
                        onClick={(): void => setModalSelection(sv)}
                      />
                      {sv in props.statVars
                        ? props.statVars[sv].title || sv
                        : sv}
                    </Label>
                  </FormGroup>
                );
              })}
            </div>
          </Container>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={(): void => confirmStatVars()}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );

  /**
   * Close the modal
   */
  function closeModal(): void {
    setExtraStatVar(EMPTY_SV_AND_INFO);
    setModalSelection("");
    setModalOpen(false);
  }

  /**
   * Confirms the variable to replace in the modal.
   */
  function confirmStatVars(): void {
    const svToRemove = _.isEmpty(modalSelection)
      ? modalSvOrder.current[0]
      : modalSelection;
    props.onStatVarRemoved(svToRemove);
    props.onStatVarSelected(extraStatVar.dcid, extraStatVar.info);
    closeModal();
  }

  /**
   * Select a variable.
   */
  function selectSV(sv: string): void {
    getStatVarInfo([sv])
      .then((svInfo) => {
        const selectedSVInfo = svInfo[sv] || {};
        if (Object.keys(props.statVars).length >= MAX_SV) {
          setExtraStatVar({ dcid: sv, info: selectedSVInfo });
          setModalOpen(true);
        } else {
          props.onStatVarSelected(sv, selectedSVInfo);
        }
      })
      .catch(() => {
        if (Object.keys(props.statVars).length >= MAX_SV) {
          setExtraStatVar({ dcid: sv, info: {} });
          setModalOpen(true);
        } else {
          props.onStatVarSelected(sv, {});
        }
      });
  }
}
