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

import axios from "axios";
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

import { getStatVarInfo } from "../../shared/stat_var";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import {
  getEnclosedPlacesPromise,
  getSamplePlaces,
} from "../../utils/place_utils";
import { AppContext } from "./app_context";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

interface StatVarSelectorPropType {
  titlePrefix: string;
  onContinueClicked: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}
export function StatVarSelector(props: StatVarSelectorPropType): JSX.Element {
  const { visType, places, enclosedPlaceType, statVars, setStatVars } =
    useContext(AppContext);
  const [samplePlaces, setSamplePlaces] = useState([]);
  const [extraSv, setExtraSv] = useState(null);
  const [modalSelection, setModalSelection] = useState(0);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const disabled =
    _.isEmpty(places) ||
    (!visTypeConfig.skipEnclosedPlaceType && !enclosedPlaceType);
  let titleNumVariables = "";
  if (visTypeConfig.numSv) {
    titleNumVariables =
      visTypeConfig.numSv === 1 ? "a" : String(visTypeConfig.numSv);
  }
  const headerTitle = `${props.titlePrefix}Select ${
    titleNumVariables ? titleNumVariables + " " : ""
  }Variable${visTypeConfig.numSv === 1 ? "" : "s"}`;

  useEffect(() => {
    if (_.isEmpty(samplePlaces) || _.isEmpty(statVars)) {
      return;
    }
    axios
      .post("/api/observation/existence", {
        entities: samplePlaces.map((place) => place.dcid),
        variables: statVars.map((sv) => sv.dcid),
      })
      .then((resp) => {
        const availableSVs = new Set();
        for (const sv of statVars) {
          // sv is used if there is even one entity(place) has observations.
          // This is apparently very loose and can be tightened by making this
          // a percentage of all entities.
          let available = false;
          for (const entity in resp.data[sv.dcid]) {
            if (resp.data[sv.dcid][entity]) {
              available = true;
              break;
            }
          }
          if (available) {
            availableSVs.add(sv.dcid);
          }
        }
        setStatVars(statVars.filter((sv) => availableSVs.has(sv.dcid)));
      });
  }, [samplePlaces]);

  useEffect(() => {
    if (!places) {
      return;
    }
    if (visTypeConfig.skipEnclosedPlaceType) {
      setSamplePlaces(places);
    } else {
      if (!enclosedPlaceType) {
        return;
      }
      getEnclosedPlacesPromise(places[0].dcid, enclosedPlaceType)
        .then((enclosedPlaces) => {
          const samplePlaces = getSamplePlaces(
            places[0].dcid,
            enclosedPlaceType,
            enclosedPlaces
          );
          setSamplePlaces(samplePlaces);
        })
        .catch(() => {
          setSamplePlaces([]);
        });
    }
  }, [places, enclosedPlaceType, visTypeConfig]);
  return (
    <div
      className={`selector-container stat-var ${
        props.collapsed ? "collapsed" : "opened"
      } ${disabled ? "disabled" : "enabled"}`}
    >
      <div className="selector-header">
        <div className="header-title">
          <span>{headerTitle}</span>
          <span
            className="material-icons-outlined"
            onClick={() => {
              if (!disabled) {
                props.setCollapsed(!props.collapsed);
              }
            }}
          >
            {props.collapsed ? "expand_more" : "expand_less"}
          </span>
        </div>
        <div className="header-subtitle">
          {props.collapsed &&
            statVars.map((sv) => sv.info.title || sv.dcid).join(", ")}
        </div>
      </div>
      {!props.collapsed && (
        <>
          <div className="selector-body">
            <div className="hierarchy-wrapper">
              <StatVarHierarchy
                type={visTypeConfig.svHierarchyType}
                entities={samplePlaces}
                selectedSVs={statVars.map((sv) => sv.dcid)}
                selectSV={addSv}
                searchLabel={""}
                deselectSV={removeSv}
                numEntitiesExistence={1}
              />
            </div>
          </div>
          <div className="selector-footer">
            {!_.isEmpty(statVars) && (
              <div
                className="continue-button"
                onClick={() => {
                  props.setCollapsed(true);
                  props.onContinueClicked();
                }}
              >
                Continue
              </div>
            )}
          </div>
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
                    {statVars
                      .filter((sv) => sv.dcid !== extraSv.dcid)
                      .map((sv, idx) => {
                        return (
                          <FormGroup
                            radio="true"
                            key={`modal-option-${idx}`}
                            row
                          >
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
                    const newStatVars = _.cloneDeep(statVars).filter(
                      (sv) => sv.dcid !== extraSv.dcid
                    );
                    newStatVars[modalSelection] = extraSv;
                    setStatVars(newStatVars);
                    setExtraSv(null);
                  }}
                >
                  Confirm
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </>
      )}
    </div>
  );

  function addSv(sv: string): void {
    getStatVarInfo([sv]).then((info) => {
      if (visTypeConfig.numSv === 1) {
        setStatVars([{ dcid: sv, info: info[sv] }]);
        return;
      }
      if (visTypeConfig.numSv && statVars.length >= visTypeConfig.numSv) {
        setExtraSv({ dcid: sv, info: info[sv] });
      }
      setStatVars([...statVars, { dcid: sv, info: info[sv] }]);
    });
  }

  function removeSv(sv: string): void {
    const svList = statVars.filter((statVar) => statVar.dcid !== sv);
    setStatVars(svList);
  }
}
