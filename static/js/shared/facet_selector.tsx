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
 * Component to edit the facet for a list of stat vars.
 */

import _ from "lodash";
import React, { ReactElement, useEffect, useMemo, useState } from "react";
import Collapsible from "react-collapsible";
import { FormGroup, Input, Label } from "reactstrap";

import { Button } from "../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../components/elements/dialog/dialog";
import { StatMetadata } from "./stat_types";

const DOWN_ARROW_HTML = <i className="material-icons">expand_more</i>;
const UP_ARROW_HTML = <i className="material-icons">expand_less</i>;
const MINUS_HTML = <i className="material-icons">remove</i>;
const PLUS_HTML = <i className="material-icons">add</i>;
const SELECTOR_PREFIX = "source-selector";
const MAX_FACETS_UNGROUPED = 3;
// The "EMPTY_METADATA_TITLE" option means the facet is picked by the API and
// different facets can be used for different data points.
const EMPTY_METADATA_TITLE =
  "Plot data points by combining data from the datasets listed below for maximal coverage";

// The information needed in SourceSelector component for a single stat var to
// get the list of available facets
export interface FacetSelectorFacetInfo {
  // dcid of the stat var
  dcid: string;
  // name of the stat var
  name: string;
  // mapping of facet id to corresponding metadata for available facets for
  // this stat var
  metadataMap: Record<string, StatMetadata>;
  // mapping of facet id to the display name to use for the corresponding facet
  displayNames?: Record<string, string>;
}

interface FacetSelectorPropType {
  // Map of sv to selected facet id
  svFacetId: Record<string, string>;
  // Promise that returns the available facet for each stat var
  facetListPromise: Promise<FacetSelectorFacetInfo[]>;
  // Callback function that is run when new facets are selected
  onSvFacetIdUpdated: (
    svFacetId: Record<string, string>,
    metadataMap: Record<string, StatMetadata>
  ) => void;
}

export function FacetSelector(props: FacetSelectorPropType): ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [facetList, setFacetList] = useState<FacetSelectorFacetInfo[] | null>(
    null
  );
  const [modalSelections, setModalSelections] = useState(props.svFacetId);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const totalFacetOptionCount = useMemo(() => {
    if (!facetList) return 0;
    return facetList.reduce((sum: number, facetInfo) => {
      const count = Object.keys(facetInfo.metadataMap).filter(
        (facetId) => facetId !== ""
      ).length;
      return sum + count;
    }, 0);
  }, [facetList]);

  useEffect(() => {
    setLoading(true);
    props.facetListPromise
      .then((resp) => {
        setFacetList(resp);
        setErrorMessage("");
        setLoading(false);
      })
      .catch(() => {
        setErrorMessage(
          "Sorry, there was an error retrieving available sources."
        );
        setLoading(false);
      });
  }, [props.facetListPromise]);

  useEffect(() => {
    // If modal is closed without updating facets, we want to reset the
    // selections in the modal.
    if (!modalOpen) {
      setModalSelections(props.svFacetId);
    }
  }, [props.svFacetId, modalOpen]);

  const showSourceOptions = facetList && !errorMessage;

  if (totalFacetOptionCount === 0) {
    return null;
  }

  return (
    <>
      <Button onClick={(): void => setModalOpen(true)}>
        Select a dataset [{totalFacetOptionCount}]
      </Button>
      <Dialog
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        loading={loading}
        maxWidth="lg"
        fullWidth
        showCloseButton
      >
        <DialogTitle>Select a dataset</DialogTitle>
        <DialogContent>
          {errorMessage && <div>{errorMessage}</div>}
          {showSourceOptions &&
            facetList.map((facetInfo) => {
              const selectedFacetId = modalSelections[facetInfo.dcid];
              return (
                <Collapsible
                  key={facetInfo.dcid}
                  trigger={getSVTriggerJsx(false, facetInfo, selectedFacetId)}
                  triggerWhenOpen={getSVTriggerJsx(
                    true,
                    facetInfo,
                    selectedFacetId
                  )}
                  open={facetList.length < 2}
                >
                  <div className={`${SELECTOR_PREFIX}-options-section`}>
                    {getFacetOptionJsx(
                      facetInfo,
                      "",
                      modalSelections,
                      setModalSelections
                    )}
                    {getFacetOptionSectionJsx(
                      facetInfo,
                      modalSelections,
                      setModalSelections
                    )}
                  </div>
                </Collapsible>
              );
            })}
        </DialogContent>
        <DialogActions>
          <Button onClick={onConfirm}>Update</Button>
        </DialogActions>
      </Dialog>
    </>
  );

  function onConfirm(): void {
    const metadataMap = {};
    facetList.forEach((facetInfo: FacetSelectorFacetInfo) => {
      const selectedFacetId = modalSelections[facetInfo.dcid];
      if (selectedFacetId) {
        metadataMap[selectedFacetId] = facetInfo.metadataMap[selectedFacetId];
      }
    });
    props.onSvFacetIdUpdated(modalSelections, metadataMap);
    setModalOpen(false);
  }
}

/**
 * Given the metadata for a facet, gets a title for the facet
 */
function getFacetTitle(metadata: StatMetadata): string {
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

/**
 * Gets the element for a single facet option
 */
function getFacetOptionJsx(
  facetInfo: FacetSelectorFacetInfo,
  facetId: string,
  modalSelections: Record<string, string>,
  setModalSelections: (selections: Record<string, string>) => void
): ReactElement {
  const metadata = facetInfo.metadataMap[facetId] || {};
  let facetTitle = getFacetTitle(metadata);
  if (facetInfo.displayNames && facetId in facetInfo.displayNames) {
    facetTitle = facetInfo.displayNames[facetId];
  }
  const selectedFacetId = modalSelections[facetInfo.dcid] || "";
  return (
    <FormGroup radio="true" row key={facetInfo.dcid + facetId}>
      <Label radio="true" className={`${SELECTOR_PREFIX}-option`}>
        <div className={`${SELECTOR_PREFIX}-option-title`}>
          <Input
            type="radio"
            name={facetInfo.dcid}
            defaultChecked={selectedFacetId === facetId}
            onClick={(): void => {
              setModalSelections({
                ...modalSelections,
                [facetInfo.dcid]: facetId,
              });
            }}
          />
          <div>{facetTitle}</div>
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
 * Gets the element for facet options section for a single stat var
 */
function getFacetOptionSectionJsx(
  facetInfo: FacetSelectorFacetInfo,
  modalSelections: Record<string, string>,
  setModalSelections: (selections: Record<string, string>) => void
): ReactElement {
  const importNameToFacetOptions: Record<string, string[]> = {};
  const facetOptionsNoImportName: string[] = [];
  let shouldShowSections = false;
  Object.keys(facetInfo.metadataMap).forEach((facetId) => {
    const importName = facetInfo.metadataMap[facetId].importName;
    if (!importName) {
      facetOptionsNoImportName.push(facetId);
      return;
    }
    if (!(importName in importNameToFacetOptions)) {
      importNameToFacetOptions[importName] = [];
    }
    importNameToFacetOptions[importName].push(facetId);
    if (importNameToFacetOptions[importName].length > MAX_FACETS_UNGROUPED) {
      shouldShowSections = true;
    }
  });
  if (shouldShowSections) {
    const sortedImportNames = Object.keys(importNameToFacetOptions).sort();
    return (
      <>
        {sortedImportNames.map((importName) => (
          <Collapsible
            key={facetInfo.dcid + importName}
            trigger={getImportTriggerJsx(false, importName)}
            triggerWhenOpen={getImportTriggerJsx(true, importName)}
          >
            {importNameToFacetOptions[importName].map((facetId) =>
              getFacetOptionJsx(
                facetInfo,
                facetId,
                modalSelections,
                setModalSelections
              )
            )}
          </Collapsible>
        ))}
        {facetOptionsNoImportName.map(
          (facetId) =>
            facetId in facetInfo.metadataMap &&
            getFacetOptionJsx(
              facetInfo,
              facetId,
              modalSelections,
              setModalSelections
            )
        )}
      </>
    );
  } else {
    return (
      <>
        {Object.keys(facetInfo.metadataMap).map((facetId) =>
          getFacetOptionJsx(
            facetInfo,
            facetId,
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
  facetInfo: FacetSelectorFacetInfo,
  selectedFacetId: string
): ReactElement {
  const metadata = facetInfo.metadataMap[selectedFacetId] || {};
  let facetTitle = getFacetTitle(metadata);
  if (facetInfo.displayNames && selectedFacetId in facetInfo.displayNames) {
    facetTitle = facetInfo.displayNames[selectedFacetId];
  }
  return (
    <div
      className={`${SELECTOR_PREFIX}-trigger ${SELECTOR_PREFIX}-sv-trigger-${
        opened ? "opened" : "closed"
      }`}
    >
      <div className={`${SELECTOR_PREFIX}-trigger-title`}>
        {facetInfo.name}
        <div className={`${SELECTOR_PREFIX}-trigger-byline`}>
          source: {facetTitle}
        </div>
      </div>
      {opened ? UP_ARROW_HTML : DOWN_ARROW_HTML}
    </div>
  );
}

/**
 * Gets the element for the trigger for a collapsible import section in the list
 * of facet options
 */
function getImportTriggerJsx(opened: boolean, title: string): ReactElement {
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
