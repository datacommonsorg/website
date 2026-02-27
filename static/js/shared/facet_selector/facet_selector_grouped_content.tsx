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
 * when in grouped mode. Grouped mode means that we do not display individual
 * facet choices for each stat var, but rather we display a single list of
 * facets, the selection of which will be applied to all stat vars.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, {
  forwardRef,
  ReactElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { intl } from "../../i18n/i18n";
import { facetSelectionComponentMessages } from "../../i18n/i18n_facet_selection_messages";
import { StatMetadata } from "../stat_types";
import { FacetOptionContent } from "./facet_option_content";
import { FacetSelectorFacetInfo } from "./facet_selector";
import { SELECTOR_PREFIX } from "./facet_selector";

interface FacetSelectorGroupedContentProps {
  facetList: FacetSelectorFacetInfo[];
  modalSelections: Record<string, string>;
  onSelectionChange: (facetId: string) => void;
  mode?: "chart" | "download";
}

interface GroupedFacetOptionProps {
  facetId: string;
  facetData: {
    metadata: StatMetadata;
    displayName?: string;
    applicableStatVars: { dcid: string; name: string }[];
  } | null;
  selectedFacetId: string;
  onSelectionChange: () => void;
  mode?: "chart" | "download";
  totalStatVars?: number;
}

export function FacetSelectorGroupedContent({
  facetList,
  modalSelections,
  onSelectionChange,
  mode,
}: FacetSelectorGroupedContentProps): ReactElement {
  const theme = useTheme();
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const [isVisible, setIsVisible] = useState(false);
  const hasScrolledRef = useRef(false);

  const unifiedFacets = useMemo(() => {
    const facetMap = new Map<
      string,
      {
        metadata: StatMetadata;
        displayName?: string;
        applicableStatVars: { dcid: string; name: string }[];
      }
    >();
    if (!facetList) return facetMap;

    for (const facetInfo of facetList) {
      for (const facetId in facetInfo.metadataMap) {
        if (facetId === "") continue;
        if (!facetMap.has(facetId)) {
          facetMap.set(facetId, {
            metadata: facetInfo.metadataMap[facetId],
            displayName: facetInfo.displayNames?.[facetId],
            applicableStatVars: [],
          });
        }
        facetMap.get(facetId).applicableStatVars.push({
          dcid: facetInfo.dcid,
          name: facetInfo.name,
        });
      }
    }
    return facetMap;
  }, [facetList]);

  const selectedFacetId = facetList.length
    ? modalSelections[facetList[0].dcid] || ""
    : "";
  const totalStatVars = facetList.length;

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
    if (selectedFacetId && selectedFacetId !== "") {
      const targetElement = itemRefs.current.get(selectedFacetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          block: "center",
        });
      }
    }
    setIsVisible(true);
    hasScrolledRef.current = true;
  }, [selectedFacetId]);

  const setRef = (facetId: string) => (el: HTMLDivElement) => {
    if (el) {
      itemRefs.current.set(facetId, el);
    } else {
      itemRefs.current.delete(facetId);
    }
  };

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
      }}
    >
      <p
        css={css`
          ${theme.typography.family.text}
          ${theme.typography.text.md}
          margin: 0;
          padding: 0;
        `}
      >
        {intl.formatMessage(
          facetSelectionComponentMessages.ExploreOtherDatasetsGroupedPromptMessage
        )}
        :
      </p>
      <div
        className={`${SELECTOR_PREFIX}-facet-options-section`}
        css={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <GroupedFacetOption
          facetId=""
          facetData={null}
          selectedFacetId={selectedFacetId}
          onSelectionChange={(): void => onSelectionChange("")}
          mode={mode}
        />
        {Array.from(unifiedFacets.entries()).map(([facetId, facetData]) => (
          <GroupedFacetOption
            key={facetId}
            ref={setRef(facetId)}
            facetId={facetId}
            facetData={facetData}
            selectedFacetId={selectedFacetId}
            onSelectionChange={(): void => onSelectionChange(facetId)}
            mode={mode}
            totalStatVars={totalStatVars}
          />
        ))}
      </div>
    </div>
  );
}

const GroupedFacetOption = forwardRef<HTMLDivElement, GroupedFacetOptionProps>(
  (
    {
      facetId,
      facetData,
      selectedFacetId,
      onSelectionChange,
      mode,
      totalStatVars,
    }: GroupedFacetOptionProps,
    ref
  ) => {
    const theme = useTheme();
    const facetOptionId = `grouped-${facetId || "default"}-option`;

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
              name="grouped-facet-selector"
              id={facetOptionId}
              checked={selectedFacetId === facetId}
              value={facetId}
              onChange={onSelectionChange}
              css={css`
                position: relative;
                margin: 5px 0 0 0;
                padding: 0;
              `}
            />
            <FacetOptionContent
              metadata={facetData?.metadata}
              displayName={facetData?.displayName}
              mode={mode}
              applicableStatVars={facetData?.applicableStatVars}
              totalStatVars={totalStatVars}
            />
          </Label>
        </FormGroup>
      </div>
    );
  }
);

GroupedFacetOption.displayName = "GroupedFacetOption";
