/**
 * Copyright 2025 Google LLC
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
import _, { startCase } from "lodash";
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
import { messages } from "../i18n/i18n_messages";
import { metadataComponentMessages } from "../i18n/i18n_metadata_messages";
import { humanizeIsoDuration } from "./periodicity";
import { StatMetadata } from "./stat_types";

const SELECTOR_PREFIX = "source-selector";

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

interface FacetSelectorRichProps {
  // the mode of the facet selector determines the copy used in the instructions
  mode?: "chart" | "download";
  // Map of sv to selected facet id
  svFacetId: Record<string, string>;
  // The list of available facets for each stat var
  facetList: FacetSelectorFacetInfo[] | null;
  // Whether the facet information is currently being loaded
  loading: boolean;
  // An error message to display if the fetch fails
  error: boolean;
  // Callback function that is run when new facets are selected
  onSvFacetIdUpdated: (
    svFacetId: Record<string, string>,
    metadataMap: Record<string, StatMetadata>
  ) => void;
}

export function FacetSelectorRich({
  mode,
  svFacetId,
  facetList,
  loading,
  error,
  onSvFacetIdUpdated,
}: FacetSelectorRichProps): ReactElement {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSelections, setModalSelections] = useState(svFacetId);

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
    // If modal is closed without updating facets, we want to reset the
    // selections in the modal.
    if (!modalOpen) {
      setModalSelections(svFacetId);
    }
  }, [svFacetId, modalOpen]);

  const showSourceOptions = facetList && !error;

  return (
    <>
      <Button
        className={`${SELECTOR_PREFIX}-open-modal-button`}
        variant="flat"
        size="sm"
        onClick={(): void => setModalOpen(true)}
        disabled={loading}
        css={css`
          font-size: 13px;
          flex-shrink: 0;
          visibility: ${loading ? "hidden" : "visible"};
        `}
      >
        {intl.formatMessage(
          facetList && facetList.length > 1
            ? facetSelectionComponentMessages.SelectDatasets
            : facetSelectionComponentMessages.SelectDataset
        ) + (totalFacetOptionCount > 0 ? ` [${totalFacetOptionCount}]` : "")}
      </Button>
      <Dialog
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        loading={loading}
        maxWidth="sm"
        fullWidth
        showCloseButton
      >
        <DialogTitle>
          {intl.formatMessage(
            facetList?.length > 1
              ? facetSelectionComponentMessages.SelectDatasets
              : facetSelectionComponentMessages.SelectDataset
          )}
        </DialogTitle>
        <DialogContent>
          {error && <div>{facetSelectionComponentMessages.DatasetError}</div>}
          {facetList?.length > 1 && (
            <p
              css={css`
                ${theme.typography.family.text}
                ${theme.typography.text.md}
                margin: 0 0 ${theme.spacing.md}px;
                padding: 0;
              `}
            >
              {intl.formatMessage(
                mode === "download"
                  ? facetSelectionComponentMessages.SelectDatasetsForDownloadPromptMessage
                  : facetSelectionComponentMessages.SelectDatasetsForChartsPromptMessage
              )}
              :
            </p>
          )}
          {showSourceOptions &&
            facetList.map((facetInfo) => {
              return (
                <div key={facetInfo.dcid}>
                  {facetList.length === 1 && (
                    <p
                      css={css`
                        ${theme.typography.family.text}
                        ${theme.typography.text.md}
                        margin: 0;
                        padding: 0;
                      `}
                    >
                      {intl.formatMessage(
                        mode === "download"
                          ? facetSelectionComponentMessages.SelectDatasetForDownloadPromptMessage
                          : facetSelectionComponentMessages.SelectDatasetForChartsPromptMessage
                      )}{" "}
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
                    className={`${SELECTOR_PREFIX}-facet-options-section`}
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
                      setModalSelections,
                      mode
                    )}
                    {getFacetOptionSectionJsx(
                      facetInfo,
                      modalSelections,
                      setModalSelections,
                      mode
                    )}
                  </div>
                </div>
              );
            })}
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={(): void => {
              setModalOpen(false);
            }}
          >
            {intl.formatMessage(messages.cancel)}
          </Button>
          <Button
            onClick={onConfirm}
            className={`${SELECTOR_PREFIX}-update-source-button`}
          >
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
    onSvFacetIdUpdated(modalSelections, metadataMap);
    setModalOpen(false);
  }
}

/**
 * Gets the element for a single facet options
 */
function getFacetOptionJsx(
  facetInfo: FacetSelectorFacetInfo,
  facetId: string,
  modalSelections: Record<string, string>,
  setModalSelections: (selections: Record<string, string>) => void,
  mode?: "chart" | "download"
): ReactElement {
  const metadata = facetInfo.metadataMap[facetId] || {};
  let primaryTitle: string;
  let firstDetailItem: string | undefined;

  if (_.isEmpty(metadata)) {
    primaryTitle = intl.formatMessage(
      mode === "download"
        ? facetSelectionComponentMessages.CombinedDatasetForDownloadOption
        : facetSelectionComponentMessages.CombinedDatasetForChartsOption
    );
  } else {
    const sourceTitle =
      (facetInfo.displayNames && facetInfo.displayNames[facetId]) ||
      metadata.sourceName ||
      metadata.importName;
    primaryTitle = metadata.provenanceName || sourceTitle;
    if (primaryTitle !== sourceTitle) {
      firstDetailItem = sourceTitle;
    }
  }

  const selectedFacetId = modalSelections[facetInfo.dcid] || "";
  const dateRange = [metadata.dateRangeStart, metadata.dateRangeEnd]
    .filter(Boolean)
    .join(" – ");

  let observationPeriodDisplay: string;
  if (metadata.observationPeriod) {
    const humanizedPeriod = humanizeIsoDuration(metadata.observationPeriod);
    observationPeriodDisplay =
      humanizedPeriod !== metadata.observationPeriod
        ? `${humanizedPeriod} (${metadata.observationPeriod})`
        : humanizedPeriod;
  }

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
          className={`${SELECTOR_PREFIX}-facet-option-title`}
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
            {primaryTitle}
          </p>
          <ul
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.sm}  
              color: #75797b;
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
            {firstDetailItem && <li>{firstDetailItem}</li>}
            {metadata.measurementMethodDescription && (
              <li>{metadata.measurementMethodDescription}</li>
            )}
            {metadata.unitDisplayName && (
              <li>
                {intl.formatMessage(metadataComponentMessages.Unit)} •{" "}
                {startCase(metadata.unitDisplayName)}
              </li>
            )}
            {metadata.scalingFactor && (
              <li>Scaling Factor • {metadata.scalingFactor}</li>
            )}
            {observationPeriodDisplay && (
              <li>
                {intl.formatMessage(
                  metadataComponentMessages.ObservationPeriod
                )}{" "}
                • {observationPeriodDisplay}
              </li>
            )}
            {dateRange && (
              <li>
                {intl.formatMessage(
                  metadataComponentMessages.MetadataDateRange
                )}{" "}
                • {dateRange}
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
  setModalSelections: (selections: Record<string, string>) => void,
  mode?: "chart" | "download"
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
                setModalSelections,
                mode
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
              setModalSelections,
              mode
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
            setModalSelections,
            mode
          )
        )}
      </>
    );
  }
}
