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

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import _ from "lodash";
import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import theme from "../../../static/js/theme/theme";
import { Button } from "../components/elements/button/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../components/elements/dialog/dialog";
import { intl } from "../i18n/i18n";
import { facetSelectionComponentMessages } from "../i18n/i18n_facet_selection_messages";
import { metadataComponentMessages } from "../i18n/i18n_metadata_messages";
import { humanizeIsoDuration } from "./periodicity";
import { StatMetadata } from "./stat_types";

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
  const theme = useTheme();
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
      <Button variant="flat" onClick={(): void => setModalOpen(true)}>
        {intl.formatMessage(facetSelectionComponentMessages.SelectDataset)} [
        {totalFacetOptionCount}]
      </Button>
      <Dialog
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        loading={loading}
        maxWidth="md"
        fullWidth
        showCloseButton
      >
        <DialogTitle>
          {intl.formatMessage(facetSelectionComponentMessages.SelectDataset)}
        </DialogTitle>
        <DialogContent>
          {errorMessage && <div>{errorMessage}</div>}
          {facetList.length > 1 && (
            <p
              css={css`
                ${theme.typography.family.text}
                ${theme.typography.text.md}
                margin: 0 0 ${theme.spacing.md}px;
                padding: 0;
              `}
            >
              {intl.formatMessage(
                facetSelectionComponentMessages.SelectDatasetPromptMessage
              )}
              :
            </p>
          )}
          {showSourceOptions &&
            facetList.map((facetInfo) => {
              return (
                <div key={facetInfo.dcid}>
                  {facetList.length == 1 && (
                    <p
                      css={css`
                        ${theme.typography.family.text}
                        ${theme.typography.text.md}
                        margin: 0;
                        padding: 0;
                      `}
                    >
                      {intl.formatMessage(
                        facetSelectionComponentMessages.SelectDatasetPromptMessage
                      )}
                      :{" "}
                      <span>
                        &ldquo;
                        {facetInfo.name}
                        &rdquo;
                      </span>
                    </p>
                  )}
                  {facetList.length > 1 && (
                    <p
                      css={css`
                        ${theme.typography.family.text}
                        ${theme.typography.text.md}
                        font-weight: 900;
                        margin: 0;
                        padding: 0;
                      `}
                    >
                      {facetInfo.name}
                    </p>
                  )}
                  <div
                    css={css`
                      padding: ${theme.spacing.lg}px ${theme.spacing.xl}px;
                      display: flex;
                      flex-direction: column;
                      gap: ${theme.spacing.md}px;
                    `}
                  >
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
                </div>
              );
            })}
        </DialogContent>
        <DialogActions>
          <Button onClick={onConfirm}>
            {intl.formatMessage(facetSelectionComponentMessages.Update)}
          </Button>
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
    return intl.formatMessage(
      facetSelectionComponentMessages.CombinedDatasetOption
    );
  }
  return metadata.importName;
}

/**
 * Gets the element for a single facet options
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
    <FormGroup
      radio="true"
      key={facetInfo.dcid + facetId}
      css={css`
        margin: 0;
        padding: 0;
      `}
    >
      <Label
        radio="true"
        css={css`
          display: flex;
          gap: ${theme.spacing.md}px;
          align-items: center;
          margin: 0;
          padding: 0;
          position: relative;
        `}
      >
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
          css={css`
            position: relative;
            margin: 0;
            padding: 0;
          `}
        />
        <div
          css={css`
            position: relative;
            margin: 0;
            padding: 0;
          `}
        >
          <p
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.md}
              margin: 0;
              padding: 0;
              white-space: pre-wrap;
              word-break: break-word;
            `}
          >
            {facetTitle}
          </p>
          <ul
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.sm}
              color: ${theme.colors.text.secondary.base};
              margin: 0;
              padding: 0;
              li {
                list-style: none;
                margin: 0;
                padding: 0;
                white-space: pre-wrap;
                word-break: break-word;
              }
            `}
          >
            {metadata.measurementMethod && (
              <li>
                {intl.formatMessage(metadataComponentMessages.MeasuringMethod)}{" "}
                • {metadata.measurementMethod}
              </li>
            )}
            {metadata.scalingFactor && (
              <li>Scaling Factor • {metadata.scalingFactor}</li>
            )}
            {metadata.unit && (
              <li>
                {intl.formatMessage(metadataComponentMessages.Unit)} •{" "}
                {metadata.unit}
              </li>
            )}
            {metadata.observationPeriod && (
              <li>
                {intl.formatMessage(
                  metadataComponentMessages.ObservationPeriod
                )}{" "}
                • {humanizeIsoDuration(metadata.observationPeriod)}
              </li>
            )}
          </ul>
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
    shouldShowSections = true;
  });
  if (shouldShowSections) {
    const sortedImportNames = Object.keys(importNameToFacetOptions).sort();
    return (
      <>
        {sortedImportNames.map((importName) => (
          <div
            key={facetInfo.dcid + importName}
            css={css`
              display: flex;
              flex-direction: column;
              gap: ${theme.spacing.md}px;
            `}
          >
            {importNameToFacetOptions[importName].map((facetId) =>
              getFacetOptionJsx(
                facetInfo,
                facetId,
                modalSelections,
                setModalSelections
              )
            )}
          </div>
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
