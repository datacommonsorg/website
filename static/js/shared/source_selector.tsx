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
 * Component to edit the source for a list of stat vars.
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";
import Collapsible from "react-collapsible";
import {
  Button,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "reactstrap";

import { StatMetadata } from "./stat_types";

const MODAL_MAX_WIDTH = "90vw";
const DOWN_ARROW_HTML = <i className="material-icons">expand_more</i>;
const UP_ARROW_HTML = <i className="material-icons">expand_less</i>;
const MINUS_HTML = <i className="material-icons">remove</i>;
const PLUS_HTML = <i className="material-icons">add</i>;
const SELECTOR_PREFIX = "source-selector";
const MAX_SOURCES_UNGROUPED = 3;
// Best Available means the source is picked by the API and different sources
// can be used for different data points.
const EMPTY_METADATA_TITLE = "Best Available";

// The information needed in SourceSelector component for a single stat var
export interface SourceSelectorSvInfo {
  // dcid of the stat var
  dcid: string;
  // name of the stat var
  name: string;
  // string to identify the metadata of the source used for this stat var
  metahash: string;
  // mapping of metahashes to corresponding metadata for available sources for
  // this stat var
  metadataMap: Record<string, StatMetadata>;
  // mapping of metahash to the display name to use for the corresponding source
  displayNames?: Record<string, string>;
}

interface SourceSelectorPropType {
  svInfoList: SourceSelectorSvInfo[];
  onSvMetahashUpdated: (svMetahashMap: Record<string, string>) => void;
}

export function SourceSelector(props: SourceSelectorPropType): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSelections, setModalSelections] = useState(
    getModalSelections(props.svInfoList)
  );

  useEffect(() => {
    // If modal is closed without updating sources, we want to reset the
    // selections in the modal.
    if (!modalOpen) {
      setModalSelections(getModalSelections(props.svInfoList));
    }
  }, [props.svInfoList, modalOpen]);

  return (
    <>
      <Button
        className={`${SELECTOR_PREFIX}-open-modal-button`}
        size="sm"
        color="light"
        onClick={() => setModalOpen(true)}
      >
        Select {props.svInfoList.length > 1 ? "Sources" : "Source"}
      </Button>
      <Modal
        isOpen={modalOpen}
        className={`${SELECTOR_PREFIX}-modal`}
        style={{ maxWidth: MODAL_MAX_WIDTH }}
      >
        <ModalHeader toggle={() => setModalOpen(false)}>
          Source Selector
        </ModalHeader>
        <ModalBody>
          {props.svInfoList.map((svInfo) => {
            const selectedMetahash = modalSelections[svInfo.dcid];
            return (
              <Collapsible
                key={svInfo.dcid}
                trigger={getSVTriggerJsx(false, svInfo, selectedMetahash)}
                triggerWhenOpen={getSVTriggerJsx(
                  true,
                  svInfo,
                  selectedMetahash
                )}
                open={props.svInfoList.length < 2}
              >
                <div className={`${SELECTOR_PREFIX}-options-section`}>
                  {getSourceOptionJsx(
                    svInfo,
                    "",
                    modalSelections,
                    setModalSelections
                  )}
                  {getSourceOptionSectionJsx(
                    svInfo,
                    modalSelections,
                    setModalSelections
                  )}
                </div>
              </Collapsible>
            );
          })}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={onConfirm}>
            Update
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );

  function onConfirm(): void {
    props.onSvMetahashUpdated(modalSelections);
    setModalOpen(false);
  }
}

/**
 * Gets the element for a single source option
 */
function getSourceOptionJsx(
  svInfo: SourceSelectorSvInfo,
  metahash: string,
  modalSelections: Record<string, string>,
  setModalSelections: (selections: Record<string, string>) => void
): JSX.Element {
  const metadata = svInfo.metadataMap[metahash] || {};
  let sourceTitle = getSourceTitle(metadata);
  if (svInfo.displayNames && metahash in svInfo.displayNames) {
    sourceTitle = svInfo.displayNames[metahash];
  }
  return (
    <FormGroup radio="true" row key={svInfo.dcid + metahash}>
      <Label radio="true" className={`${SELECTOR_PREFIX}-option`}>
        <div className={`${SELECTOR_PREFIX}-option-title`}>
          <Input
            type="radio"
            name={svInfo.dcid}
            defaultChecked={svInfo.metahash === metahash}
            onClick={() => {
              setModalSelections({
                ...modalSelections,
                [svInfo.dcid]: metahash,
              });
            }}
          />
          <div>{sourceTitle}</div>
        </div>
        <div className={`${SELECTOR_PREFIX}-option-details`}>
          {metadata.importName && <div>importName: {metadata.importName}</div>}
          {metadata.measurementMethod && (
            <div>measurementMethod: {metadata.measurementMethod}</div>
          )}
          {metadata.observationPeriod && (
            <div>observationPeriod: {metadata.observationPeriod}</div>
          )}
          {metadata.scalingFactor && (
            <div>scalingFactor: {metadata.scalingFactor}</div>
          )}
          {metadata.unit && <div>unit: {metadata.unit}</div>}
        </div>
      </Label>
    </FormGroup>
  );
}

/**
 * Gets the element for source options section for a single stat var
 */
function getSourceOptionSectionJsx(
  svInfo: SourceSelectorSvInfo,
  modalSelections: Record<string, string>,
  setModalSelections: (selections: Record<string, string>) => void
): JSX.Element {
  const importNameToSourceOptions: Record<string, string[]> = {};
  const sourceOptionsNoImportName: string[] = [];
  let shouldShowSections = false;
  Object.keys(svInfo.metadataMap).forEach((metahash) => {
    const importName = svInfo.metadataMap[metahash].importName;
    if (!importName) {
      sourceOptionsNoImportName.push(metahash);
      return;
    }
    if (!(importName in importNameToSourceOptions)) {
      importNameToSourceOptions[importName] = [];
    }
    importNameToSourceOptions[importName].push(metahash);
    if (importNameToSourceOptions[importName].length > MAX_SOURCES_UNGROUPED) {
      shouldShowSections = true;
    }
  });
  if (shouldShowSections) {
    const sortedImportNames = Object.keys(importNameToSourceOptions).sort();
    return (
      <>
        {sortedImportNames.map((importName) => (
          <Collapsible
            key={svInfo.dcid + importName}
            trigger={getImportTriggerJsx(false, importName)}
            triggerWhenOpen={getImportTriggerJsx(true, importName)}
          >
            {importNameToSourceOptions[importName].map((metahash) =>
              getSourceOptionJsx(
                svInfo,
                metahash,
                modalSelections,
                setModalSelections
              )
            )}
          </Collapsible>
        ))}
        {sourceOptionsNoImportName.map(
          (metahash) =>
            metahash in svInfo.metadataMap &&
            getSourceOptionJsx(
              svInfo,
              metahash,
              modalSelections,
              setModalSelections
            )
        )}
      </>
    );
  } else {
    return (
      <>
        {Object.keys(svInfo.metadataMap).map((metahash) =>
          getSourceOptionJsx(
            svInfo,
            metahash,
            modalSelections,
            setModalSelections
          )
        )}
      </>
    );
  }
}

/**
 * Gets the element for the trigger for a collapsible stat var section
 */
function getSVTriggerJsx(
  opened: boolean,
  svInfo: SourceSelectorSvInfo,
  selectedMetahash: string
): JSX.Element {
  const metadata = svInfo.metadataMap[selectedMetahash] || {};
  let sourceTitle = getSourceTitle(metadata);
  if (svInfo.displayNames && selectedMetahash in svInfo.displayNames) {
    sourceTitle = svInfo.displayNames[selectedMetahash];
  }
  return (
    <div
      className={`${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-sv-trigger-${
        opened ? "opened" : "closed"
      }`}
    >
      <div className={`${SELECTOR_PREFIX}-trigger-title`}>
        {svInfo.name}
        <div className={`${SELECTOR_PREFIX}-trigger-byline`}>
          source: {sourceTitle}
        </div>
      </div>
      {opened ? UP_ARROW_HTML : DOWN_ARROW_HTML}
    </div>
  );
}

/**
 * Gets the element for the trigger for a collapsible import section in the list
 * of source options
 */
function getImportTriggerJsx(opened: boolean, title: string): JSX.Element {
  return (
    <div
      className={`${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-import-trigger-${
        opened ? "opened" : "closed"
      }`}
    >
      {opened ? MINUS_HTML : PLUS_HTML}
      <div className={`${SELECTOR_PREFIX}-trigger-title`}>{title}</div>
    </div>
  );
}

/**
 * Given a list of SourceSelectorSvInfo, gets a map of stat var to selected
 * source metahash
 */
function getModalSelections(
  svInfo: SourceSelectorSvInfo[]
): Record<string, string> {
  const result = {};
  svInfo.forEach((info) => (result[info.dcid] = info.metahash));
  return result;
}

/**
 * Given the metadata for a source, gets a title for the source
 */
function getSourceTitle(metadata: StatMetadata): string {
  if (_.isEmpty(metadata)) {
    return EMPTY_METADATA_TITLE;
  }
  let result = `[${metadata.importName}]`;
  let first = true;
  for (const text of [
    metadata.measurementMethod,
    metadata.observationPeriod,
    metadata.scalingFactor,
    metadata.unit,
  ]) {
    if (text) {
      if (!first) {
        result += ", ";
      }
      result += text;
      first = false;
    }
  }
  return result;
}
