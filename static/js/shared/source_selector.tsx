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

import { StatMetadata } from "../tools/shared_util";

const MODAL_MAX_WIDTH = "700px";
const DOWN_ARROW_HTML = <i className="material-icons">expand_more</i>;
const UP_ARROW_HTML = <i className="material-icons">expand_less</i>;
const MINUS_HTML = <i className="material-icons">remove</i>;
const PLUS_HTML = <i className="material-icons">add</i>;
const SELECTOR_PREFIX = "source-selector";

export interface SourceSelectorSvInfo {
  dcid: string;
  name: string;
  metahash: string;
  metadataMap: Record<string, StatMetadata>;
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
        Edit {props.svInfoList.length > 1 ? "Sources" : "Source"}
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
            const selectedMetadata =
              selectedMetahash in svInfo.metadataMap
                ? svInfo.metadataMap[selectedMetahash]
                : {};
            return (
              <Collapsible
                key={svInfo.dcid}
                trigger={getSVTriggerJsx(false, svInfo.name, selectedMetadata)}
                triggerWhenOpen={getSVTriggerJsx(
                  true,
                  svInfo.name,
                  selectedMetadata
                )}
                open={props.svInfoList.length < 2}
              >
                <div className={`${SELECTOR_PREFIX}-options-section`}>
                  {getSourceOptionJsx(svInfo, "")}
                  {getSourceOptionSectionJsx(svInfo)}
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

  function getSourceOptionJsx(
    svInfo: SourceSelectorSvInfo,
    metahash: string
  ): JSX.Element {
    const metadata = svInfo.metadataMap[metahash] || {};
    const sourceTitle = getSourceTitle(metadata);
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
            {metadata.importName && (
              <div>importName: {metadata.importName}</div>
            )}
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

  function getSourceOptionSectionJsx(
    svInfo: SourceSelectorSvInfo
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
      if (importNameToSourceOptions[importName].length > 3) {
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
                getSourceOptionJsx(svInfo, metahash)
              )}
            </Collapsible>
          ))}
          {sourceOptionsNoImportName.map(
            (metahash) =>
              metahash in svInfo.metadataMap &&
              getSourceOptionJsx(svInfo, metahash)
          )}
        </>
      );
    } else {
      return (
        <>
          {Object.keys(svInfo.metadataMap).map((metahash) =>
            getSourceOptionJsx(svInfo, metahash)
          )}
        </>
      );
    }
  }

  function onConfirm(): void {
    props.onSvMetahashUpdated(modalSelections);
    setModalOpen(false);
  }
}

function getSVTriggerJsx(
  opened: boolean,
  svName: string,
  selectedMetadata: StatMetadata
): JSX.Element {
  const sourceTitle = getSourceTitle(selectedMetadata);
  return (
    <div
      className={
        opened
          ? `${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-sv-trigger-opened`
          : `${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-sv-trigger-closed`
      }
    >
      <div className={`${SELECTOR_PREFIX}-trigger-title`}>
        {svName}
        <div className={`${SELECTOR_PREFIX}-trigger-byline`}>
          source: {sourceTitle}
        </div>
      </div>
      {opened ? UP_ARROW_HTML : DOWN_ARROW_HTML}
    </div>
  );
}

function getImportTriggerJsx(opened: boolean, title: string): JSX.Element {
  return (
    <div
      className={
        opened
          ? `${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-import-trigger-opened`
          : `${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-import-trigger-closed`
      }
    >
      {opened ? MINUS_HTML : PLUS_HTML}
      <div className={`${SELECTOR_PREFIX}-trigger-title`}>{title}</div>
    </div>
  );
}

function getModalSelections(
  svInfo: SourceSelectorSvInfo[]
): Record<string, string> {
  const result = {};
  svInfo.forEach((info) => (result[info.dcid] = info.metahash));
  return result;
}

function getSourceTitle(metadata: StatMetadata): string {
  if (_.isEmpty(metadata)) {
    return "Best Available";
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
