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
import { Menu } from "../statsvar_menu";
import { NoopStatsVarFilter, TimelineStatsVarFilter } from "../commons";
import { StatsVarNode, getStatsVar } from "../timeline_util";
import {
  Context,
  EmptyAxis,
  Axis,
  setStatVar,
  setStatVarName,
  unsetStatVar,
} from "./scatter2_context";
import { Spinner } from "./scatter2_spinner";

interface NamedStatVar {
  statVar: StatsVarNode;
  name: string;
}

function StatVarChooser(): JSX.Element {
  const context = useContext(Context);

  const emptyStatVar: NamedStatVar = Object.freeze({
    statVar: {},
    name: "",
  });
  const defaultModalSelected = Object.freeze({
    x: true,
    y: true,
    third: false,
  });
  const [thirdStatVar, setThirdStatVar] = useState(emptyStatVar);
  const [modalSelected, setModalSelected] = useState(defaultModalSelected);
  const menuSelected = {
    ...context.x.value.statVar,
    ...context.y.value.statVar,
    ...thirdStatVar.statVar,
  };

  const [validStatVars, setValidStatVars] = useState(new Set<string>());
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const places = context.place.value.enclosedPlaces;
    if (_.isEmpty(places)) {
      return;
    }
    getStatsVar(places.map((place) => place.dcid)).then((statVars) => {
      setValidStatVars(statVars);

      let message = "";
      const statVarX = _.findKey(context.x.value.statVar);
      const statVarY = _.findKey(context.y.value.statVar);
      if (statVarX && !statVars.has(statVarX)) {
        unsetStatVar(context.x);
        message += `Sorry, no data available for ${statVarX}`;
      }
      if (statVarY && !statVars.has(statVarY)) {
        unsetStatVar(context.y);
        message += message.length
          ? ` or ${statVarY}`
          : `Sorry, no data available for ${statVarY}`;
      }
      if (message.length) {
        alert(message);
      }
    });
    setLoading(true);
  }, [context.place.value.enclosedPlaces]);

  useEffect(() => {
    if (!_.isEmpty(validStatVars)) {
      setLoading(false);
    }
  }, [validStatVars]);

  function addStatVar(
    statVar: string,
    nodePath: string[],
    denominators?: string[]
  ) {
    const node = {
      [statVar]: { paths: [nodePath], denominators: denominators },
    };
    if (_.isEmpty(context.x.value.statVar)) {
      setStatVar(context.x, node);
    } else if (_.isEmpty(context.y.value.statVar)) {
      setStatVar(context.y, node);
    } else {
      setThirdStatVar({ statVar: node, name: "" });
    }
  }

  function removeStatVar(statVar: string) {
    if (_.keys(context.x.value.statVar)[0] === statVar) {
      unsetStatVar(context.x);
    } else if (_.keys(context.y.value.statVar)[0] === statVar) {
      unsetStatVar(context.y);
    } else {
      // TODO: Error.
    }
  }

  function setStatsVarTitle(statsVarId2Title: Record<string, string>): void {
    const x = _.findKey(context.x.value.statVar);
    if (x && x in statsVarId2Title) {
      setStatVarName(context.x, statsVarId2Title[x]);
    }
    const y = _.findKey(context.y.value.statVar);
    if (y && y in statsVarId2Title) {
      setStatVarName(context.y, statsVarId2Title[y]);
    }
    const third = _.findKey(thirdStatVar.statVar);
    if (third && third in statsVarId2Title) {
      setThirdStatVar({ ...thirdStatVar, name: statsVarId2Title[third] });
    }
  }

  function selectStatVar(event: React.ChangeEvent<HTMLInputElement>): void {
    switch (event.target.name) {
      case "x":
        setModalSelected({ ...modalSelected, x: event.target.checked });
        break;
      case "y":
        setModalSelected({ ...modalSelected, y: event.target.checked });
        break;
      case "third":
        setModalSelected({ ...modalSelected, third: event.target.checked });
        break;
    }
  }

  function confirmStatVars(): void {
    if (modalSelected.x && modalSelected.y && modalSelected.third) {
      // TODO: Maybe display an error message.
      return;
    }
    const values: Array<Axis> = [];
    const axes = [context.x, context.y];

    if (modalSelected.x) {
      values.push(context.x.value);
    }
    if (modalSelected.y) {
      values.push(context.y.value);
    }
    context.y.set(EmptyAxis);
    values.push({
      ...EmptyAxis,
      statVar: thirdStatVar.statVar,
      name: thirdStatVar.name,
    });

    if (modalSelected.x) {
      axes.shift().set(values.shift());
    }
    if (modalSelected.y) {
      axes.shift().set(values.shift());
    }
    if (modalSelected.third) {
      axes.shift().set(values.shift());
    }

    setThirdStatVar(emptyStatVar);
    setModalSelected(defaultModalSelected);
  }

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
          setStatsVarTitle={setStatsVarTitle}
          addStatsVar={addStatVar}
          removeStatsVar={removeStatVar}
        ></Menu>
      </div>
      <Spinner isOpen={loading} />
      <Modal
        isOpen={!_.isEmpty(thirdStatVar.statVar)}
        backdrop="static"
        id="statvar-modal"
      >
        <ModalHeader close={null}>
          Select two of the three statistical variables
        </ModalHeader>
        <ModalBody>
          <Container>
            <FormGroup check row>
              <Label check>
                <Input
                  type="checkbox"
                  checked={modalSelected.x}
                  onChange={selectStatVar}
                  name="x"
                />
                {context.x.value.name}
              </Label>
            </FormGroup>
            <FormGroup check row>
              <Label check>
                <Input
                  type="checkbox"
                  checked={modalSelected.y}
                  onChange={selectStatVar}
                  name="y"
                />
                {context.y.value.name}
              </Label>
            </FormGroup>
            <FormGroup check row>
              <Label check>
                <Input
                  type="checkbox"
                  checked={modalSelected.third}
                  onChange={selectStatVar}
                  name="third"
                />
                {thirdStatVar.name}
              </Label>
            </FormGroup>
          </Container>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={confirmStatVars}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export { StatVarChooser };
