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
import React, {
  forwardRef,
  ReactElement,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const [isVisible, setIsVisible] = useState(false);
  const hasScrolledRef = useRef(false);

  /*
    This hook scrolls the facet selector dialog so that the currently selected item is
    centered in view. As a useLayoutEffect, it will run after the DOM is updated but
    before it is painted and visible to the user. The ref is used to ensure that the
    hook runs only when the component is first displayed. This allows us to keep the
    dependencies honest.
   */
  useLayoutEffect(() => {
    if (hasScrolledRef.current) {
      return;
    }
    let firstSelectedId: string | null = null;
    for (const facetInfo of facetList) {
      const selectedFacetId = modalSelections[facetInfo.dcid];
      if (selectedFacetId && selectedFacetId !== "") {
        firstSelectedId = selectedFacetId;
        break;
      }
    }
    if (firstSelectedId) {
      const targetElement = itemRefs.current.get(firstSelectedId);
      if (targetElement) {
        targetElement.scrollIntoView?.({
          block: "center",
        });
      }
    }
    setIsVisible(true);
    hasScrolledRef.current = true;
  }, [facetList, modalSelections]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
      }}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${facetList.length > 1 ? theme.spacing.lg : theme.spacing.sm}px;
      `}
    >
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
                    itemRefs={itemRefs}
                    mode={mode}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface FacetOptionProps {
  facetInfo: FacetSelectorFacetInfo;
  facetId: string;
  isChecked: boolean;
  onSelectionChange: () => void;
  mode?: "chart" | "download";
}

const FacetOption = forwardRef<HTMLDivElement, FacetOptionProps>(
  (
    {
      facetInfo,
      facetId,
      isChecked,
      onSelectionChange,
      mode,
    }: FacetOptionProps,
    ref
  ) => {
    const facetOptionId = `${facetInfo.dcid}-${facetId || "default"}-option`;
    const theme = useTheme();

    const metadata = facetInfo.metadataMap[facetId];
    const displayName = facetInfo.displayNames?.[facetId];

    return (
      <div ref={ref}>
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
      </div>
    );
  }
);

FacetOption.displayName = "FacetOption";

interface FacetOptionSectionProps {
  facetInfo: FacetSelectorFacetInfo;
  modalSelections: Record<string, string>;
  onSelectionChange: (dcid: string, facetId: string) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  mode?: "chart" | "download";
}

function FacetOptionSection({
  facetInfo,
  modalSelections,
  onSelectionChange,
  itemRefs,
  mode,
}: FacetOptionSectionProps): ReactElement {
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

  const setRef = (facetId: string) => (el: HTMLDivElement) => {
    if (el) {
      itemRefs.current.set(facetId, el);
    } else {
      itemRefs.current.delete(facetId);
    }
  };

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
                ref={setRef(facetId)}
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
            ref={setRef(facetId)}
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
                ref={setRef(facetId)}
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
