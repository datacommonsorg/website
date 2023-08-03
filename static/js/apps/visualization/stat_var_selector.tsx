/**
 * Copyright 2023 Google LLC
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
 * Component for the stat var selector
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

import { Spinner } from "../../components/spinner";
import { getStatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import { getFilteredStatVarPromise } from "../../utils/app/visualization_utils";
import { AppContext } from "./app_context";
import { VIS_TYPE_CONFIG } from "./vis_type_configs";

interface StatVarSelectorPropType {
  selectOnContinue?: boolean;
}

export function StatVarSelector(props: StatVarSelectorPropType): JSX.Element {
  const {
    visType,
    places,
    enclosedPlaceType,
    samplePlaces,
    statVars,
    setStatVars,
  } = useContext(AppContext);
  const [extraSv, setExtraSv] = useState(null);
  const [modalSelection, setModalSelection] = useState(0);
  const [selectedStatVars, setSelectedStatVars] = useState(statVars);
  const visTypeConfig = VIS_TYPE_CONFIG[visType];

  useEffect(() => {
    if (visTypeConfig.numSv && selectedStatVars.length > visTypeConfig.numSv) {
      setSelectedStatVars(selectedStatVars.slice(0, visTypeConfig.numSv));
    }
  }, [visTypeConfig]);

  useEffect(() => {
    if (!_.isEqual(statVars, selectedStatVars)) {
      setSelectedStatVars(statVars);
    }
  }, [statVars]);

  useEffect(() => {
    if (!props.selectOnContinue || samplePlaces === null) {
      return;
    }
    getFilteredStatVarPromise(
      samplePlaces,
      selectedStatVars,
      visTypeConfig
    ).then((filteredStatVars) => {
      if (!_.isEqual(filteredStatVars, selectedStatVars)) {
        setSelectedStatVars(filteredStatVars);
      }
    });
  }, [samplePlaces]);

  return (
    <div className="stat-var-selector">
      <div className="selector-body">
        {!_.isNull(samplePlaces) && _.isEmpty(samplePlaces) && (
          <span className="info-message">
            Sorry, we don&apos;t have any variables available for{" "}
            {enclosedPlaceType}s in {places[0].name}. Please select different
            place options.
          </span>
        )}
        {!_.isEmpty(samplePlaces) && (
          <StatVarHierarchy
            type={visTypeConfig.svHierarchyType}
            entities={samplePlaces}
            selectedSVs={selectedStatVars.map((sv) => sv.dcid)}
            selectSV={addSv}
            searchLabel={""}
            deselectSV={removeSv}
            numEntitiesExistence={Math.min(
              Math.max(samplePlaces.length, 1),
              visTypeConfig.svHierarchyNumExistence || 1
            )}
          />
        )}
        <Spinner isOpen={_.isNull(samplePlaces)} />
      </div>
      {props.selectOnContinue && (
        <div className="selector-footer">
          {selectedStatVars.length >= (visTypeConfig.numSv || 1) && (
            <div
              className="primary-button continue-button"
              onClick={() => setStatVars(selectedStatVars)}
            >
              Display
            </div>
          )}
        </div>
      )}
      {/* Modal for selecting 2 stat vars when a third is selected */}
      {!_.isEmpty(extraSv) && (
        <Modal
          isOpen={!_.isEmpty(extraSv)}
          backdrop="static"
          id="statvar-modal"
        >
          <ModalHeader
            toggle={() => {
              removeSv(extraSv.dcid);
              setExtraSv(null);
            }}
          >
            Only {visTypeConfig.numSv} Statistical Variables Supported
          </ModalHeader>
          <ModalBody>
            <Container>
              <div>
                You selected:{" "}
                <b>{extraSv ? extraSv.info.title || extraSv.dcid : ""}</b>
              </div>
              <div className="radio-selection-label">
                Please choose 1 statistical variable to replace:
              </div>
              <div className="radio-selection-section">
                {selectedStatVars
                  .filter((sv) => sv.dcid !== extraSv.dcid)
                  .map((sv, idx) => {
                    return (
                      <FormGroup radio="true" key={`modal-option-${idx}`} row>
                        <Label radio="true">
                          <Input
                            type="radio"
                            name="statvar"
                            defaultChecked={idx === modalSelection}
                            onClick={() => setModalSelection(idx)}
                          />
                          {sv.info.title || sv.dcid}
                        </Label>
                      </FormGroup>
                    );
                  })}
              </div>
            </Container>
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onClick={() => {
                const newStatVars = _.cloneDeep(selectedStatVars).filter(
                  (sv) => sv.dcid !== extraSv.dcid
                );
                newStatVars[modalSelection] = extraSv;
                if (props.selectOnContinue) {
                  setSelectedStatVars(newStatVars);
                } else {
                  setStatVars(newStatVars);
                }
                setExtraSv(null);
              }}
            >
              Confirm
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );

  function addSv(sv: string): void {
    getStatVarInfo([sv]).then((info) => {
      const setStatVarsFn = props.selectOnContinue
        ? setSelectedStatVars
        : setStatVars;
      if (visTypeConfig.numSv === 1) {
        setStatVarsFn([{ dcid: sv, info: info[sv] }]);
        return;
      }
      if (
        visTypeConfig.numSv &&
        selectedStatVars.length >= visTypeConfig.numSv
      ) {
        setExtraSv({ dcid: sv, info: info[sv] });
      }
      setStatVarsFn([...selectedStatVars, { dcid: sv, info: info[sv] }]);
    });
  }

  function removeSv(sv: string): void {
    const svList = selectedStatVars.filter((statVar) => statVar.dcid !== sv);
    if (props.selectOnContinue) {
      setSelectedStatVars(svList);
    } else {
      setStatVars(svList);
    }
  }
}
