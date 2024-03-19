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
  flex-direction: row;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: space-evenly;
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
  color: ${(props) => props.theme.highlightColors.dark};
  font-size: 45px;
  font-weight: 400;
  line-height: 52px;

  @media ${BREAKPOINTS.md} {
    font-size: 28px;
    line-height: 36px;
  }
`;

interface HighlightConfigEntry {
  label: string;
  value: string | number;
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
      {props.config.map((callout, index) => {
        const value =
          typeof callout.value === "number"
            ? formatNumber(callout.value, props.locale)
            : callout.value;
        return (
          <Label key={index}>
            {callout.label}
            <Highlight>{value}</Highlight>
          </Label>
        );
      })}
    </HighlightsContainer>
  );
}
