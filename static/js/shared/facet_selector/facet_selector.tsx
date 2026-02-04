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
import _, { isEqual } from "lodash";
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
import { FacetSelectionCriteria } from "../../types/facet_selection_criteria";
import { findMatchingFacets } from "../../utils/data_fetch_utils";
import { StatMetadata } from "../stat_types";
import { FacetSelectorGroupedContent } from "./facet_selector_grouped_content";
import { FacetSelectorStandardContent } from "./facet_selector_standard_content";

export const SELECTOR_PREFIX = "source-selector";

/**
 * If true, the facet selector will show all available facet options, even if they
 * are inconsistent across different statistical variables in grouped mode. It will
 * also display a debug flag in debug mode to indicate the issue.
 * If false, it will filter the list to only show facet options that are common to
 * all statistical variables.
 *
 * In non-grouped mode, this flag will have no effect.
 */
const SHOW_INCONSISTENT_FACETS = false;

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

interface FacetSelectorProps {
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
  // If set, when a facet is selected for one stat var, the corresponding facet
  // is selected for all other stat vars. Only facets in common with all stat
  // vars will be selectable. This is currently used only for bar charts.
  allowSelectionGrouping?: boolean;
  // Facet Selector
  facetSelector?: FacetSelectionCriteria;
  // useInjectedFacet
  useInjectedFacet?: boolean;
  setUseInjectedFacet?: (useInjectedFacet: boolean) => void;
}

/**
 * This function builds the final list of stat vars and their respective facets that
 * will be used by the selector.
 *
 * In standard mode (not grouping selections into a single list), it returns the list unchanged.
 * In grouped mode, it removes facets that are not common to all stat vars,
 * unless showInconsistentFacets is true.
 *
 * @param originalFacetList {FacetSelectorFacetInfo[] | null} List of stat vars with facets passed into the component
 * @param allowSelectionGrouping {boolean} If true, the component plans to display a single list of facet.
 * @param showInconsistentFacets {boolean} If true, in grouped mode the selector will not drop inconsistent facets.
 */
const buildFinalFacetList = (
  originalFacetList: FacetSelectorFacetInfo[] | null,
  allowSelectionGrouping: boolean,
  showInconsistentFacets: boolean
): FacetSelectorFacetInfo[] | null => {
  if (showInconsistentFacets || !allowSelectionGrouping || !originalFacetList) {
    return originalFacetList;
  }

  const totalStatVars = originalFacetList.length;
  if (totalStatVars <= 1) {
    return originalFacetList;
  }

  // 1. We determine the facet ids in common with all stat vars
  let commonFacetIds = new Set(Object.keys(originalFacetList[0].metadataMap));

  for (let i = 1; i < totalStatVars; i++) {
    if (commonFacetIds.size === 0) {
      break;
    }
    const currentFacetIds = Object.keys(originalFacetList[i].metadataMap);
    const intersection = new Set<string>();
    for (const facetId of currentFacetIds) {
      if (commonFacetIds.has(facetId)) {
        intersection.add(facetId);
      }
    }
    commonFacetIds = intersection;
  }

  // 2. We rebuild the facetList, only including those consistent facets.
  const filteredList: FacetSelectorFacetInfo[] = [];
  for (const originalFacetInfo of originalFacetList) {
    const newMetadataMap: Record<string, StatMetadata> = {};
    for (const facetId of commonFacetIds) {
      if (originalFacetInfo.metadataMap[facetId]) {
        newMetadataMap[facetId] = originalFacetInfo.metadataMap[facetId];
      }
    }
    filteredList.push({
      ...originalFacetInfo,
      metadataMap: newMetadataMap,
    });
  }

  return filteredList;
};

export function FacetSelector(props: FacetSelectorProps): ReactElement {
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
  const [useInjectedFacet, setUseInjectedFacet] = useState(true);

  const finalFacetList = useMemo(() => {
    return buildFinalFacetList(
      facetList,
      allowSelectionGrouping,
      SHOW_INCONSISTENT_FACETS
    );
  }, [facetList, allowSelectionGrouping]);

  const totalFacetOptionCount = useMemo(() => {
    if (!finalFacetList) {
      return 0;
    }
    const uniqueFacetIds = new Set<string>();
    finalFacetList.forEach((facetInfo) => {
      Object.keys(facetInfo.metadataMap).forEach((facetId) => {
        if (facetId !== "") {
          uniqueFacetIds.add(facetId);
        }
      });
    });
    return uniqueFacetIds.size;
  }, [finalFacetList]);

  const hasAlternativeSources = useMemo(() => {
    if (loading || !finalFacetList) {
      return false;
    }
    return finalFacetList.some(
      (facetInfo) => Object.keys(facetInfo.metadataMap).length > 1
    );
  }, [finalFacetList, loading]);

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
    SHOW_INCONSISTENT_FACETS &&
    allowSelectionGrouping &&
    !loading &&
    !error &&
    !areFacetsConsistent(facetList);

  /*
   This is true if more than one choice can be made in the dialog (i.e.,
   we are not in grouped mode, and we have more than one stat var).
   */
  const multipleChoicesAvailable =
    !allowSelectionGrouping && finalFacetList && finalFacetList.length > 1;

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
            ? multipleChoicesAvailable
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
        facetList={finalFacetList}
        open={modalOpen}
        onClose={(): void => setModalOpen(false)}
        multipleChoicesAvailable={multipleChoicesAvailable}
        useInjectedFacet={useInjectedFacet}
        setUseInjectedFacet={setUseInjectedFacet}
      />
    </>
  );
}

function NoFacetChoicesMessage({
  variant,
  loading,
}: Pick<FacetSelectorProps, "variant" | "loading">): ReactElement | null {
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
  props: FacetSelectorProps & {
    open: boolean;
    onClose: () => void;
    multipleChoicesAvailable: boolean;
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
    useInjectedFacet,
  } = props;
  const [modalSelections, setModalSelections] = useState(svFacetId);

  useEffect(() => {
    const injectedFacetId = useInjectedFacet
      ? findMatchingFacets(facetList[0]["metadataMap"], props?.facetSelector)
      : undefined;
    if (!_.isEmpty(injectedFacetId)) {
      setModalSelections({ [facetList[0]["dcid"]]: injectedFacetId[0] });
    }
    // If modal is closed without updating facets, we want to reset the
    // selections in the modal.
    if (!open && !useInjectedFacet) {
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
    props.setUseInjectedFacet(false);
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
          props.multipleChoicesAvailable
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
