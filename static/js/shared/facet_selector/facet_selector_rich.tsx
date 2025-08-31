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
 * Component to allow the facet selection for a chart. It will render
 * an interface where the user can select either:
 *
 * 1. Standard mode: a facet for each stat var, where each stat var may
 *    be given its own stat var.
 * 2. Grouped mode: a single facet list, where only one facet is chosen
 *    (and this facet is applied to all stat vars).
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import { isEqual } from "lodash";
import React, { ReactElement, useEffect, useMemo, useState } from "react";

import { Button } from "../../components/elements/button/button";
import { DebugFlag } from "../../components/elements/debug_flag";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../../components/elements/dialog/dialog";
import { intl } from "../../i18n/i18n";
import { facetSelectionComponentMessages } from "../../i18n/i18n_facet_selection_messages";
import { messages } from "../../i18n/i18n_messages";
import { StatMetadata } from "../stat_types";
import { FacetSelectorGroupedContent } from "./facet_selector_grouped_content";
import { FacetSelectorStandardContent } from "./facet_selector_standard_content";

export const SELECTOR_PREFIX = "source-selector";

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
  // the variant with small used for the old tools, inline as an inline
  // text button and standard elsewhere
  variant?: "standard" | "small" | "inline";
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
  // If set, when a facet is selected for one stat var, the corresponding
  // facet is selected for all other stat vars. This only applies if all
  // stat vars have the same facet choices.
  allowSelectionGrouping?: boolean;
}

export function FacetSelectorRich(props: FacetSelectorRichProps): ReactElement {
  const {
    variant = "standard",
    mode,
    facetList,
    loading,
    error,
    allowSelectionGrouping = false,
  } = props;
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const totalFacetOptionCount = useMemo(() => {
    if (!facetList) {
      return 0;
    }
    const uniqueFacetIds = new Set<string>();
    facetList.forEach((facetInfo) => {
      Object.keys(facetInfo.metadataMap).forEach((facetId) => {
        if (facetId !== "") {
          uniqueFacetIds.add(facetId);
        }
      });
    });
    return uniqueFacetIds.size;
  }, [facetList]);

  const hasAlternativeSources = useMemo(() => {
    if (loading || !facetList) {
      return false;
    }
    return facetList.some(
      (facetInfo) => Object.keys(facetInfo.metadataMap).length > 1
    );
  }, [facetList, loading]);

  function areFacetsConsistent(
    facetList: FacetSelectorFacetInfo[] | null
  ): boolean {
    if (!facetList || facetList.length <= 1) {
      return true;
    }
    const firstFacetIds = Object.keys(facetList[0].metadataMap).sort();
    for (let i = 1; i < facetList.length; i++) {
      const currentFacetIds = Object.keys(facetList[i].metadataMap).sort();
      if (!isEqual(firstFacetIds, currentFacetIds)) {
        return false;
      }
    }
    return true;
  }

  if (!hasAlternativeSources) {
    if (mode === "download") {
      return null;
    }
    return <NoFacetChoicesMessage variant={variant} loading={loading} />;
  }

  const showInconsistentFacetFlag =
    allowSelectionGrouping &&
    !loading &&
    !error &&
    !areFacetsConsistent(facetList);

  return (
    <>
      <Button
        className={`${SELECTOR_PREFIX}-open-modal-button`}
        variant={`${variant === "inline" ? "text" : "flat"}`}
        size="sm"
        onClick={(): void => setModalOpen(true)}
        disabled={loading}
        css={css`
          ${variant === "small" ? "font-size: 13px;" : ""}
          flex-shrink: 0;
          visibility: ${loading ? "hidden" : "visible"};
          ${variant === "inline" ? "padding: 0;" : ""}
          &:hover:not(:disabled):not([aria-disabled]) {
            ${variant === "inline"
              ? "text-decoration: underline; border: 1px solid transparent;"
              : ""}
          }
        `}
      >
        {intl.formatMessage(
          mode === "download"
            ? facetList && facetList.length > 1
              ? facetSelectionComponentMessages.SelectDatasets
              : facetSelectionComponentMessages.SelectDataset
            : facetSelectionComponentMessages.ExploreOtherDatasets
        ) + (totalFacetOptionCount > 0 ? ` (${totalFacetOptionCount})` : "")}
      </Button>
      {showInconsistentFacetFlag && (
        <div
          css={css`
            display: inline-flex;
            padding-left: ${theme.spacing.xs}px;
            transform: translateY(-1px);
          `}
        >
          <DebugFlag message="This chart’s facet choices are not consistent across all statistical variables." />
        </div>
      )}
      <FacetSelectorModal
        {...props}
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
      />
    </>
  );
}

function NoFacetChoicesMessage({
  variant,
  loading,
}: Pick<FacetSelectorRichProps, "variant" | "loading">): ReactElement | null {
  const theme = useTheme();
  return (
    <p
      css={css`
        ${variant === "small" ? "font-size: 13px;" : theme.typography.text.sm}
        ${theme.typography.family.text}
        ${theme.button.size.md}
        padding: ${variant === "inline" ? "0px" : "inherit"};
        padding-left: ${variant === "inline" ? "0" : theme.spacing.sm}px;
        border: 1px solid transparent;
        line-height: 1rem;
        && {
          color: ${theme.colors.text.tertiary.base};
        }
        flex-shrink: 0;
        visibility: ${loading ? "hidden" : "visible"};
        margin: 0;
      `}
    >
      {intl.formatMessage(
        facetSelectionComponentMessages.NoAlternativeDatasets
      )}
    </p>
  );
}

function FacetSelectorModal(
  props: FacetSelectorRichProps & {
    open: boolean;
    onClose: () => void;
  }
): ReactElement {
  const {
    open,
    onClose,
    loading,
    error,
    facetList,
    svFacetId,
    onSvFacetIdUpdated,
    allowSelectionGrouping,
    mode,
  } = props;
  const [modalSelections, setModalSelections] = useState(svFacetId);

  useEffect(() => {
    // If modal is closed without updating facets, we want to reset the
    // selections in the modal.
    if (!open) {
      setModalSelections(svFacetId);
    }
  }, [svFacetId, open]);

  const handleSelectionChange = (
    clickedDcid: string,
    clickedFacetId: string
  ): void => {
    setModalSelections({
      ...modalSelections,
      [clickedDcid]: clickedFacetId,
    });
  };

  const handleGroupedSelectionChange = (clickedFacetId: string): void => {
    const newSelections: Record<string, string> = {};
    if (facetList) {
      for (const facetInfo of facetList) {
        newSelections[facetInfo.dcid] = clickedFacetId;
      }
    }
    setModalSelections(newSelections);
  };

  function onConfirm(): void {
    const metadataMap = {};
    facetList.forEach((facetInfo: FacetSelectorFacetInfo) => {
      const selectedFacetId = modalSelections[facetInfo.dcid];
      if (selectedFacetId && selectedFacetId in facetInfo.metadataMap) {
        metadataMap[selectedFacetId] = facetInfo.metadataMap[selectedFacetId];
      }
    });
    onSvFacetIdUpdated(modalSelections, metadataMap);
    onClose();
  }

  const showSourceOptions = facetList && !error;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      loading={loading}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {intl.formatMessage(
          facetList?.length > 1
            ? facetSelectionComponentMessages.SelectDatasets
            : facetSelectionComponentMessages.SelectDataset
        )}
      </DialogTitle>
      <DialogContent>
        {error && (
          <div>
            {intl.formatMessage(facetSelectionComponentMessages.DatasetError)}
          </div>
        )}
        {showSourceOptions &&
          (allowSelectionGrouping ? (
            <FacetSelectorGroupedContent
              facetList={facetList}
              modalSelections={modalSelections}
              onSelectionChange={handleGroupedSelectionChange}
              mode={mode}
            />
          ) : (
            <FacetSelectorStandardContent
              facetList={facetList}
              modalSelections={modalSelections}
              onSelectionChange={handleSelectionChange}
              mode={mode}
            />
          ))}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          {intl.formatMessage(error ? messages.close : messages.cancel)}
        </Button>
        {!error && (
          <Button
            onClick={onConfirm}
            className={`${SELECTOR_PREFIX}-update-source-button`}
          >
            {intl.formatMessage(facetSelectionComponentMessages.Update)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
