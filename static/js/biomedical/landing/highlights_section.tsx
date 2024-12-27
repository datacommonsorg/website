/**
 * Copyright 2024 Google LLC
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
 * Section calling out Biomedical KG stats on the Biomedical DC landing page.
 */

import React from "react";
import { styled } from "styled-components";

import { BREAKPOINTS } from "./constants";
import { ContentContainer } from "./shared_styled_components";

const HighlightsContainer = styled(ContentContainer)`
  column-gap: 24px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  row-gap: 32px;
  width: 100%;

  @media ${BREAKPOINTS.lg} {
    align-items: center;
    flex-direction: column;
  }
`;

const NumbersContainer = styled.div`
  align-items: center;
  column-gap: 48px;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  flex-wrap: wrap;
  justify-content: space-evenly;
  row-gap: 24px;
  text-align: center;
`;

const Label = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 22px;
  font-weight: 400;
  gap: 16px;
  line-height: 28px;

  @media ${BREAKPOINTS.md} {
    font-size: 16px;
    line-height: 20px;
  }
`;

const Highlight = styled.div`
  color: ${(props): string => props.theme.highlightColors.dark};
  font-size: 45px;
  font-weight: 400;
  line-height: 52px;

  @media ${BREAKPOINTS.md} {
    font-size: 28px;
    line-height: 36px;
  }
`;

const KnowledgeGraphExplorerLinkContainer = styled.div`
  border-left: 1px solid #a0cfcd;
  color: #1e4e4c;
  display: flex;
  flex-direction: column;
  font-size: 22px;
  font-weight: 400;
  gap: 16px;
  line-height: 28px;
  padding-left: 24px;
  text-align: left;
  width: 340px;

  @media ${BREAKPOINTS.md} {
    font-size: 16px;
    line-height: 20px;
  }

  @media ${BREAKPOINTS.lg} {
    align-items: center;
    border-left: none;
    justify-content: center;
    text-align: center;
    width: fit-content;
  }

  a {
    width: fit-content;
  }

  a:hover {
    text-decoration: none;
  }

  .icon {
    font-size: 32px;
  }
`;

interface HighlightConfigEntry {
  label: string;
  value: number;
}
interface HighlightsSectionProps {
  config: HighlightConfigEntry[];
  locale: string;
}

/**
 * Helper function for formatting numeric values of the highlights.
 * Localizes the value highlighted to the given locale
 * @param number number to format
 * @param locale locale to localize number to
 * @returns formatted number for display.
 */
function formatNumber(number: number, locale: string): string {
  const formatOptions: Intl.NumberFormatOptions = {
    compactDisplay: "short",
    notation: "standard",
  };
  return Intl.NumberFormat(locale, formatOptions).format(number);
}

export function HighlightsSection(props: HighlightsSectionProps): JSX.Element {
  return (
    <HighlightsContainer className="container">
      <NumbersContainer>
        {props.config.map((callout, index) => {
          const value = formatNumber(callout.value, props.locale);
          return (
            <Label key={index}>
              {callout.label}
              <Highlight>{value}</Highlight>
            </Label>
          );
        })}
      </NumbersContainer>
      <KnowledgeGraphExplorerLinkContainer>
        <a href="/browser/bio">See all data sources & categories</a>
        <a href="/browser/bio">
          <span className="material-icons-outlined icon">
            arrow_circle_right
          </span>
        </a>
      </KnowledgeGraphExplorerLinkContainer>
    </HighlightsContainer>
  );
}
