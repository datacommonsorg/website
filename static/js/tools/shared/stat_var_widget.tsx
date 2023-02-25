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
import React, { createRef, useEffect } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { NamedNode } from "../../shared/types";
import { DrawerToggle } from "../../stat_var_hierarchy/drawer_toggle";
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
  // Number of entities that should have data for each stat var (group) shown
  numEntitiesExistence?: number;
}

export function StatVarWidget(props: StatVarWidgetPropsType): JSX.Element {
  // Set up refs for sv widget modal. Widget is tied to the LHS menu but
  // reattached to the modal when it is opened on small screens.
  const svHierarchyModalRef = createRef<HTMLDivElement>();
  const svHierarchyContainerRef = createRef<HTMLDivElement>();

  function onSvModalOpened(): void {
    if (svHierarchyModalRef.current && svHierarchyContainerRef.current) {
      svHierarchyModalRef.current.appendChild(svHierarchyContainerRef.current);
    }
  }

  function onSvModalClosed(): void {
    document
      .getElementById("explore")
      .appendChild(svHierarchyContainerRef.current);
  }

  useEffect(() => {
    if (!_.isEmpty(props.sampleEntities) && !_.isEmpty(props.selectedSVs)) {
      axios
        .post("/api/place/stat-vars/union", {
          dcids: props.sampleEntities.map((place) => place.dcid),
          statVars: Object.keys(props.selectedSVs),
        })
        .then((resp) => {
          const availableSVs = resp.data;
          const unavailableSVs = [];
          for (const sv in props.selectedSVs) {
            if (availableSVs.indexOf(sv) === -1) {
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
      <div className="d-none d-lg-flex explore-menu-container" id="explore">
        {props.collapsible && (
          <DrawerToggle
            collapseElemId="explore"
            visibleElemId="stat-var-hierarchy-section"
          />
        )}
        <div ref={svHierarchyContainerRef} className="full-size">
          <StatVarHierarchy
            type={props.svHierarchyType}
            entities={props.sampleEntities}
            selectedSVs={Object.keys(props.selectedSVs)}
            selectSV={props.selectSV}
            searchLabel={"Statistical Variables"}
            deselectSV={(sv) => props.deselectSVs([sv])}
            numEntitiesExistence={props.numEntitiesExistence}
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
          <div ref={svHierarchyModalRef} className="full-size"></div>
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
