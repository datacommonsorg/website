/**
 * Copyright 2022 Google LLC
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
 * Component for the stat var widget to be used by the website tools
 */

import axios from "axios";
import _ from "lodash";
import React, { createRef, useEffect, useRef, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { STAT_VAR_SELECTOR_WIDTH } from "../../constants/tools_constants";
import { NamedNode } from "../../shared/types";
import { DrawerResize } from "../../stat_var_hierarchy/drawer_resize";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import { StatVarInfo } from "../timeline/chart_region";

interface StatVarWidgetPropsType {
  // Whether or not modal version of sv hierarchy is opened
  openSvHierarchyModal: boolean;
  // callback function when modal version of sv hierarchy is opened
  openSvHierarchyModalCallback: () => void;
  // Whether or not the stat var widget should be able to be collapsed
  collapsible: boolean;
  // The type of svHierarchy to render
  svHierarchyType: string;
  // List of sample entities to use to figure out what stat vars are available
  sampleEntities: NamedNode[];
  // Callback function when a list of stat vars are deselected
  deselectSVs: (svList: string[]) => void;
  // (Optional) A map of stat var dcid to their StatVarInfo for stat vars
  // selected from parent component.
  // For example, in timeline tool, these are stat vars parsed from URL.
  selectedSVs?: Record<string, StatVarInfo>;
  // Callback function when a stat var is selected
  selectSV?: (sv: string) => void;
  // Whether to disable the alert when there are unavailable SVs.
  disableAlert?: boolean;
}

export function StatVarWidget(props: StatVarWidgetPropsType): JSX.Element {
  // Set up refs for sv widget modal. Widget is tied to the LHS menu but
  // reattached to the modal when it is opened on small screens.
  const svHierarchyModalRef = createRef<HTMLDivElement>();
  const svHierarchyContainerRef = createRef<HTMLDivElement>();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(STAT_VAR_SELECTOR_WIDTH);

  useEffect(() => {
    if (!_.isEmpty(props.sampleEntities) && !_.isEmpty(props.selectedSVs)) {
      axios
        .post("/api/observation/existence", {
          entities: props.sampleEntities.map((place) => place.dcid),
          variables: Object.keys(props.selectedSVs),
        })
        .then((resp) => {
          const availableSVs = [];
          const unavailableSVs = [];
          for (const sv in props.selectedSVs) {
            // sv is used if there is even one entity(place) has observations.
            // This is apparently very loose and can be tightened by making this
            // a percentage of all entities.
            let available = false;
            for (const entity in resp.data[sv]) {
              if (resp.data[sv][entity]) {
                available = true;
                break;
              }
            }
            if (available) {
              availableSVs.push(sv);
            } else {
              unavailableSVs.push(sv);
            }
          }
          if (!_.isEmpty(unavailableSVs)) {
            props.deselectSVs(unavailableSVs);
            if (!props.disableAlert) {
              alert(
                `Sorry, the selected variable${
                  unavailableSVs.length > 1 ? "s" : ""
                } [${unavailableSVs
                  .map((sv) => props.selectedSVs[sv].title || sv)
                  .join(", ")}] ` +
                  `${
                    unavailableSVs.length > 1 ? "are" : "is"
                  } not available for the chosen place${
                    props.sampleEntities.length > 1 ? "s" : ""
                  }.`
              );
            }
          }
        });
    }
  }, [props.sampleEntities]);

  return (
    <>
      <div
        className={`d-none d-lg-flex explore-menu-container ${
          isCollapsed ? "collapsed" : ""
        }`}
        id="explore"
        ref={sidebarRef}
        style={{ width }}
      >
        <div ref={svHierarchyContainerRef} className="full-size">
          <StatVarHierarchy
            hidden={isCollapsed}
            type={props.svHierarchyType}
            entities={props.sampleEntities}
            selectedSVs={Object.keys(props.selectedSVs)}
            selectSV={props.selectSV}
            searchLabel={"Statistical variables"}
            deselectSV={(sv) => props.deselectSVs([sv])}
            numEntitiesExistence={getNumEntitiesExistence()}
          />
        </div>
        <DrawerResize
          collapsible={props.collapsible}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setWidth={setWidth}
          sidebarRef={sidebarRef}
        />
      </div>
      <Modal
        isOpen={props.openSvHierarchyModal}
        toggle={props.openSvHierarchyModalCallback}
        className="modal-dialog-centered modal-lg"
        contentClassName="modal-sv-widget"
        scrollable={true}
      >
        <ModalHeader toggle={props.openSvHierarchyModalCallback}>
          Select Variables
        </ModalHeader>
        <ModalBody>
          <StatVarHierarchy
            hidden={isCollapsed}
            type={props.svHierarchyType}
            entities={props.sampleEntities}
            selectedSVs={Object.keys(props.selectedSVs)}
            selectSV={props.selectSV}
            searchLabel={"Statistical variables"}
            deselectSV={(sv) => props.deselectSVs([sv])}
            numEntitiesExistence={getNumEntitiesExistence()}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={props.openSvHierarchyModalCallback}>
            Done
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );

  /**
   * Get number of required entities for stat var filtering.
   *
   * NumEntitiesExistence is a parameter that sets the number of entities that
   * should have data for each stat var (group) shown in the widget. For
   * example, setting a value of 10 means that at least 10 entities must have
   * data for a stat var for that stat var to show in the widget. This prevents
   * showing users stat vars with low geographic coverage that lead to sparse
   * charts.
   *
   * @returns minimum number of entities to use for stat var filtering
   */
  function getNumEntitiesExistence(): number {
    return Math.min(
      globalThis.minStatVarGeoCoverage || 1,
      props.sampleEntities.length
    );
  }
}
