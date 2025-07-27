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
 * Component to display the facet selections within the facet selector modal,
 * when in standard (default) mode. Standard mode means that when we have
 * multiple stat vars, each stat var is given its own facet list, and
 * the chosen facet only applies to that stat var.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { intl } from "../../i18n/i18n";
import { facetSelectionComponentMessages } from "../../i18n/i18n_facet_selection_messages";
import { FacetOptionContent } from "./facet_option_content";
import { FacetSelectorFacetInfo } from "./facet_selector";

const SELECTOR_PREFIX = "source-selector";

interface FacetSelectorStandardContentProps {
  facetList: FacetSelectorFacetInfo[];
  modalSelections: Record<string, string>;
  onSelectionChange: (dcid: string, facetId: string) => void;
  mode?: "chart" | "download";
}

export function FacetSelectorStandardContent({
  facetList,
  modalSelections,
  onSelectionChange,
  mode,
}: FacetSelectorStandardContentProps): ReactElement {
  const theme = useTheme();
  return (
    <>
      {facetList.length > 1 && (
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
              ? facetSelectionComponentMessages.SelectDatasetsForDownloadPromptMessage
              : facetSelectionComponentMessages.ExploreOtherDatasetsMultipleStatVarsPromptMessage
          )}
          :
        </p>
      )}
      {facetList.map((facetInfo) => {
        const facetIds = Object.keys(facetInfo.metadataMap).filter(
          (id) => id !== ""
        );
        const hasOnlyOneSource = facetIds.length === 1;
        const sourceFacetId = hasOnlyOneSource ? facetIds[0] : null;

        return (
          <div
            key={facetInfo.dcid}
            css={css`
              display: flex;
              flex-direction: column;
              gap: ${facetList.length > 1
                ? theme.spacing.sm
                : theme.spacing.lg}px;
            `}
          >
            {facetList.length > 1 ? (
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
            ) : (
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
                    : facetSelectionComponentMessages.ExploreOtherDatasetsSingleStatVarPromptMessage
                )}{" "}
                <span>
                  &ldquo;
                  {facetInfo.name}
                  &rdquo;
                </span>
              </p>
            )}
            <div
              className={`${SELECTOR_PREFIX}-facet-options-section`}
              css={css`
                display: flex;
                flex-direction: column;
              `}
            >
              {hasOnlyOneSource ? (
                <FacetOption
                  facetInfo={facetInfo}
                  facetId={sourceFacetId}
                  isChecked={true}
                  onSelectionChange={(): void =>
                    onSelectionChange(facetInfo.dcid, "")
                  }
                  mode={mode}
                />
              ) : (
                <>
                  <FacetOption
                    facetInfo={facetInfo}
                    facetId={""}
                    isChecked={(modalSelections[facetInfo.dcid] || "") === ""}
                    onSelectionChange={(): void =>
                      onSelectionChange(facetInfo.dcid, "")
                    }
                    mode={mode}
                  />
                  <FacetOptionSection
                    facetInfo={facetInfo}
                    modalSelections={modalSelections}
                    onSelectionChange={onSelectionChange}
                    mode={mode}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

interface FacetOptionProps {
  facetInfo: FacetSelectorFacetInfo;
  facetId: string;
  isChecked: boolean;
  onSelectionChange: () => void;
  mode?: "chart" | "download";
}

function FacetOption({
  facetInfo,
  facetId,
  isChecked,
  onSelectionChange,
  mode,
}: FacetOptionProps): ReactElement {
  const facetOptionId = `${facetInfo.dcid}-${facetId || "default"}-option`;
  const theme = useTheme();

  const metadata = facetInfo.metadataMap[facetId];
  const displayName = facetInfo.displayNames?.[facetId];

  return (
    <FormGroup
      radio="true"
      key={facetOptionId}
      css={css`
        margin: 0;
        padding: 0;
      `}
    >
      <Label
        radio="true"
        for={facetOptionId}
        css={css`
          display: flex;
          gap: ${theme.spacing.md}px;
          align-items: flex-start;
          margin: 0;
          padding: ${theme.spacing.sm}px ${theme.spacing.xl}px;
          position: relative;
          cursor: pointer;
          &:hover,
          &:checked {
            background: ${theme.colors.background.primary.light};
          }
        `}
      >
        <Input
          type="radio"
          name={facetInfo.dcid}
          id={facetOptionId}
          checked={isChecked}
          onChange={onSelectionChange}
          css={css`
            position: relative;
            margin: 5px 0 0 0;
            padding: 0;
          `}
        />
        <FacetOptionContent
          metadata={metadata}
          displayName={displayName}
          mode={mode}
        />
      </Label>
    </FormGroup>
  );
}

interface FacetOptionSectionProps {
  facetInfo: FacetSelectorFacetInfo;
  modalSelections: Record<string, string>;
  onSelectionChange: (dcid: string, facetId: string) => void;
  mode?: "chart" | "download";
}

function FacetOptionSection({
  facetInfo,
  modalSelections,
  onSelectionChange,
  mode,
}: FacetOptionSectionProps): ReactElement {
  const theme = useTheme();

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

  const selectedFacetId = modalSelections[facetInfo.dcid] || "";

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
            `}
          >
            {importNameToFacetOptions[importName].map((facetId) => (
              <FacetOption
                key={facetId}
                facetInfo={facetInfo}
                facetId={facetId}
                isChecked={selectedFacetId === facetId}
                onSelectionChange={(): void =>
                  onSelectionChange(facetInfo.dcid, facetId)
                }
                mode={mode}
              />
            ))}
          </div>
        ))}
        {facetOptionsNoImportName.map((facetId) => (
          <FacetOption
            key={facetId}
            facetInfo={facetInfo}
            facetId={facetId}
            isChecked={selectedFacetId === facetId}
            onSelectionChange={(): void =>
              onSelectionChange(facetInfo.dcid, facetId)
            }
            mode={mode}
          />
        ))}
      </>
    );
  } else {
    return (
      <>
        {Object.keys(facetInfo.metadataMap).map(
          (facetId) =>
            facetId !== "" && (
              <FacetOption
                key={facetId}
                facetInfo={facetInfo}
                facetId={facetId}
                isChecked={selectedFacetId === facetId}
                onSelectionChange={(): void =>
                  onSelectionChange(facetInfo.dcid, facetId)
                }
                mode={mode}
              />
            )
        )}
      </>
    );
  }
}
