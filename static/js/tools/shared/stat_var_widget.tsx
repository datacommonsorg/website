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

import _ from "lodash";
import React, { createRef } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

import { DrawerToggle } from "../../stat_var_hierarchy/drawer_toggle";
import {
  StatVarHierarchy,
  StatVarHierarchyPropType,
} from "../../stat_var_hierarchy/stat_var_hierarchy";

interface StatVarWidgetPropsType {
  openSvHierarchyModal: boolean;
  openSvHierarchyModalCallback: () => void;
  svHierarchyProps: StatVarHierarchyPropType;
  collapsible: boolean;
}

export function StatVarWidget(props: StatVarWidgetPropsType): JSX.Element {
  // Set up refs for sv widget modal. Widget is tied to the LHS menu but
  // reattached to the modal when it is opened on small screens.
  const svHierarchyModalRef = createRef<HTMLDivElement>();
  const svHierarchyContainerRef = createRef<HTMLDivElement>();

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
        {props.collapsible && (
          <DrawerToggle
            collapseElemId="explore"
            visibleElemId="stat-var-hierarchy-section"
          />
        )}
        <div ref={svHierarchyContainerRef} className="full-size">
          <StatVarHierarchy
            type={props.svHierarchyProps.type}
            places={props.svHierarchyProps.places}
            selectedSVs={props.svHierarchyProps.selectedSVs}
            selectSV={props.svHierarchyProps.selectSV}
            searchLabel={"Statistical Variables"}
            deselectSV={props.svHierarchyProps.deselectSV}
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
