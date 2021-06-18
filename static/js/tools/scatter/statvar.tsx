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

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Container,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import { Menu } from "../statvar_menu/menu";
import { NoopStatsVarFilter, TimelineStatsVarFilter } from "../commons";
import { StatsVarNode, getStatsVar } from "../statvar_menu/util";
import {
  Context,
  EmptyAxis,
  Axis,
  AxisWrapper,
  IsLoadingWrapper,
} from "./context";
import { NamedNode } from "../../shared/types";
import { nodeGetStatVar } from "./util";

interface NamedStatVar {
  // Always contains a single statvar.
  statVar: StatsVarNode;
  name: string;
}

const emptyStatVar: NamedStatVar = Object.freeze({
  statVar: {},
  name: "",
});

interface ModalSelected {
  x: boolean;
  y: boolean;
}

const defaultModalSelected: ModalSelected = Object.freeze({
  x: true,
  y: false,
});

function StatVarChooser(): JSX.Element {
  const { x, y } = useContext(Context);

  // Temporary variable for storing an extra statvar.
  const [thirdStatVar, setThirdStatVar] = useState(emptyStatVar);
  // Records which two of the three statvars are wanted if a third statvar is selected.
  const [modalSelected, setModalSelected] = useState(defaultModalSelected);
  const [modalOpen, setModalOpen] = useState(false);
  // Passed to the statvar menu.
  const menuSelected = {
    ...x.value.statVar,
    ...y.value.statVar,
    ...thirdStatVar.statVar,
  };
  // Filtered statvar DCIDs.
  const validStatVars = useValidStatVars();
  const closeModal = () => {
    setThirdStatVar(emptyStatVar);
    setModalOpen(false);
  };

  return (
    <div className="explore-menu-container" id="explore">
      <div id="drill-scroll-container">
        <div className="title">Select variables:</div>
        <Menu
          selectedNodes={menuSelected}
          statsVarFilter={
            _.isEmpty(validStatVars)
              ? new NoopStatsVarFilter()
              : new TimelineStatsVarFilter(validStatVars)
          }
          setStatsVarTitle={(statsVarId2Title) =>
            setStatsVarTitle(
              x,
              y,
              statsVarId2Title,
              thirdStatVar,
              setThirdStatVar
            )
          }
          addStatsVar={(statsVar, nodePath, denominators) =>
            addStatVar(
              x,
              y,
              statsVar,
              nodePath,
              denominators,
              setThirdStatVar,
              setModalOpen
            )
          }
          removeStatsVar={(statsVar, nodePath) =>
            removeStatVar(x, y, statsVar, nodePath)
          }
        ></Menu>
      </div>
      <Modal isOpen={modalOpen} backdrop="static" id="statvar-modal">
        <ModalHeader toggle={closeModal}>
          Only Two Variables Supported
        </ModalHeader>
        <ModalBody>
          <Container>
            <div>
              You selected: <b>{thirdStatVar.name}</b>
            </div>
            <div className="radio-selection-label">
              Please choose 1 more variable to keep:
            </div>
            <div className="radio-selection-section">
              <FormGroup radio row>
                <Label radio>
                  <Input
                    id="x-radio-button"
                    type="radio"
                    name="statvar"
                    defaultChecked={modalSelected.x}
                    onClick={() => setModalSelected({ x: true, y: false })}
                  />
                  {x.value.name}
                </Label>
              </FormGroup>
              <FormGroup radio row>
                <Label radio>
                  <Input
                    id="y-radio-button"
                    type="radio"
                    name="statvar"
                    defaultChecked={modalSelected.y}
                    onClick={() => setModalSelected({ x: false, y: true })}
                  />
                  {y.value.name}
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
    </div>
  );
}

/**
 * Hook that returns a set of statvars available for the child places.
 */
function useValidStatVars(): Set<string> {
  const { place, x, y, isLoading } = useContext(Context);

  // Stores filtered statvar DCIDs.
  const [validStatVars, setValidStatVars] = useState(new Set<string>());

  // When child places change, refilter the statvars.
  useEffect(() => {
    if (_.isEmpty(place.value.enclosedPlaces)) {
      setValidStatVars(new Set<string>());
      return;
    }
    filterStatVars(
      x,
      y,
      place.value.enclosedPlaces,
      isLoading,
      setValidStatVars
    );
  }, [place.value.enclosedPlaces]);

  return validStatVars;
}

/**
 * Retrieves and sets statvars shown in the statvar menu.
 * A statvar is kept if it is available for at least one of the child places.
 * Throws an alert if a currently selected statvar is filtered out.
 * @param x
 * @param y
 * @param enclosedPlaces
 * @param isLoading
 * @param setValidStatVars
 */
async function filterStatVars(
  x: AxisWrapper,
  y: AxisWrapper,
  enclosedPlaces: Array<NamedNode>,
  isLoading: IsLoadingWrapper,
  setValidStatVars: (statVars: Set<string>) => void
): Promise<void> {
  isLoading.setAreStatVarsLoading(true);
  const statVars = await getStatsVar(
    enclosedPlaces.map((namedPlace) => namedPlace.dcid),
    true
  );
  setValidStatVars(statVars);
  isLoading.setAreStatVarsLoading(false);
  alertIfStatVarsUnavailable(x, y, statVars);
}

/**
 * Throws an alert if a currently selected statvar is not available.
 * @param x
 * @param y
 * @param statVars Set of available statvars
 */
function alertIfStatVarsUnavailable(
  x: AxisWrapper,
  y: AxisWrapper,
  statVars: Set<string>
) {
  let message = "";
  const statVarX = nodeGetStatVar(x.value.statVar);
  const statVarY = nodeGetStatVar(y.value.statVar);
  if (statVarX && !statVars.has(statVarX)) {
    x.unsetStatVar();
    message += `Sorry, no data available for ${statVarX}`;
  }
  if (statVarY && !statVars.has(statVarY)) {
    y.unsetStatVar();
    message += message.length
      ? ` or ${statVarY}`
      : `Sorry, no data available for ${statVarY}`;
  }
  if (message) {
    alert(`${message}. Try picking other variables.`);
  }
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
  statVar: string,
  nodePath: string[],
  denominators: string[],
  setThirdStatVar: (statVar: NamedStatVar) => void,
  setModalOpen: (open: boolean) => void
) {
  const node = {
    [statVar]: { paths: [nodePath], denominators: denominators },
  };
  if (_.isEmpty(x.value.statVar)) {
    x.setStatVar(node);
  } else if (_.isEmpty(y.value.statVar)) {
    y.setStatVar(node);
  } else {
    setThirdStatVar({ statVar: node, name: "" });
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
function removeStatVar(
  x: AxisWrapper,
  y: AxisWrapper,
  statVar: string,
  nodePath?: string[]
) {
  const statVarX = _.keys(x.value.statVar)[0];
  const statVarY = _.keys(y.value.statVar)[0];
  const path = [nodePath];
  if (
    statVarX === statVar &&
    (!nodePath || _.isEqual(x.value.statVar[statVarX].paths, path))
  ) {
    x.unsetStatVar();
  } else if (
    statVarY === statVar &&
    (!nodePath || _.isEqual(y.value.statVar[statVarY].paths, path))
  ) {
    y.unsetStatVar();
  }
}

/**
 * Sets the title of a statvar.
 * The title could be for the statvar for the x axis,
 * the statvar for the y axis, or the third, extra statvar.
 * @param x
 * @param y
 * @param statsVarId2Title
 * @param thirdStatVar
 * @param setThirdStatVar
 */
function setStatsVarTitle(
  x: AxisWrapper,
  y: AxisWrapper,
  statsVarId2Title: Record<string, string>,
  thirdStatVar: NamedStatVar,
  setThirdStatVar: (statVar: NamedStatVar) => void
): void {
  const statVarX = nodeGetStatVar(x.value.statVar);
  if (statVarX && statVarX in statsVarId2Title) {
    x.setStatVarName(statsVarId2Title[statVarX]);
  }
  const statVarY = nodeGetStatVar(y.value.statVar);
  if (statVarY && statVarY in statsVarId2Title) {
    y.setStatVarName(statsVarId2Title[statVarY]);
  }
  const statVarThird = nodeGetStatVar(thirdStatVar.statVar);
  if (statVarThird && statVarThird in statsVarId2Title) {
    setThirdStatVar({ ...thirdStatVar, name: statsVarId2Title[statVarThird] });
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
  thirdStatVar: NamedStatVar,
  setThirdStatVar: (statVar: NamedStatVar) => void,
  modalSelected: ModalSelected,
  setModalSelected: (modalSelected: ModalSelected) => void,
  setModalOpened: (open: boolean) => void
): void {
  const values: Array<Axis> = [];
  const axes = [x, y];
  if (modalSelected.x) {
    values.push(x.value);
  } else {
    assignAxes([x], [EmptyAxis]);
  }
  if (modalSelected.y) {
    values.push(y.value);
  } else {
    assignAxes([y], [EmptyAxis]);
  }
  values.push({
    ...EmptyAxis,
    statVar: thirdStatVar.statVar,
    name: thirdStatVar.name,
  });
  assignAxes(axes, values);
  assignAxes(axes, values);
  setThirdStatVar(emptyStatVar);
  setModalSelected(defaultModalSelected);
  setModalOpened(false);
}

/**
 * Assigns the first `Axis` in `values` to the first `AxisWrapper` in axes while
 * keeping the log and per capita options in the original `AxisWrapper`.
 * The `Axis` and `AxisWrapper` involved are removed from the arrays.
 * @param axes
 * @param values
 */
function assignAxes(axes: Array<AxisWrapper>, values: Array<Axis>) {
  const axis = axes.shift();
  axis.set({
    ...values.shift(),
    log: axis.value.log,
    perCapita: axis.value.perCapita,
  });
}

export { StatVarChooser };
