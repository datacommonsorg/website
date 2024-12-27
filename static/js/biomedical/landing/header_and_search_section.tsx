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
 * Title and search box section of the Biomedical DC landing page.
 */

import React from "react";
import { styled } from "styled-components";

import {
  BIOMEDICAL_SEARCH_QUERY_PARAM,
  BIOMEDICAL_SEARCH_URL,
  BREAKPOINTS,
} from "./constants";
import { MultiLineSearchBox } from "./multi_line_search_box";
import {
  ContentContainer,
  SectionWithBackground,
} from "./shared_styled_components";

// Starting text in the search box
const SEARCH_BOX_PLACEHOLDER_TEXT =
  "E.g. What disease are the following genetic variances associated with? rs7903146, rs2237897, rs4712524, rs6769511, rs5219";

const HeadingContainer = styled(ContentContainer)`
  border-bottom: 1px solid #dde3ea;
  box-sizing: border-box;
  flex-direction: row;
  gap: 64px;
  padding-bottom: 0px;
`;

const StyledText = styled.div`
  flex-grow: 1;

  a {
    color: ${(props): string => props.theme.text.linkColor};
  }
  h1 {
    color: ${(props): string => props.theme.header.textColor};
    font-size: 36px;
    font-weight: 400;
    line-height: 44px;
    margin-bottom: 8px;

    @media ${BREAKPOINTS.md} {
      font-size: 28px;
      line-height: 36px;
    }
  }

  h2 {
    color: ${(props): string => props.theme.header.textColor};
    font-size: 22px;
    font-weight: 400;
    line-height: 28px;
    margin-bottom: 8px;

    @media ${BREAKPOINTS.md} {
      font-size: 18px;
      line-height: 28px;
    }
  }

  h3 {
    color: ${(props): string => props.theme.header.textColorLight};
    font-size: 22px;
    font-weight: 400;
    line-height: 28px;

    @media ${BREAKPOINTS.md} {
      font-size: 16px;
      line-height: 24px;
    }
  }
`;

const ThematicImage = styled.div`
  margin-top: auto;

  @media ${BREAKPOINTS.md} {
    display: none;
  }
`;

/**
 * Callback function to handle search
 * @param query search query entered by the user
 */
function onSearch(query: string): void {
  // Sanitize query to prevent cross-site scripting attacks
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.set(BIOMEDICAL_SEARCH_QUERY_PARAM, query);
  urlSearchParams.set("dc", "bio");
  window.location.href = `${BIOMEDICAL_SEARCH_URL}${urlSearchParams.toString()}`;
}

export function HeaderAndSearchBox(): JSX.Element {
  return (
    <SectionWithBackground>
      <HeadingContainer className="container">
        <StyledText>
          <h1>Data Commons • Biomedical</h1>
          <h2>A bridge to open biomedical data</h2>
          <h3>
            Find relationships between{" "}
            <a href="/browser/bio">25 biomedical categories</a> sourced from{" "}
            <a href="https://docs.datacommons.org/datasets/Biomedical.html">
              18 trusted sources
            </a>
            , including NIH NCBI and EMBL-EBI
          </h3>
          <MultiLineSearchBox
            onSearch={onSearch}
            placeholderText={SEARCH_BOX_PLACEHOLDER_TEXT}
          />
        </StyledText>
        <ThematicImage>
          <img src="/images/biomedical/person-reading-genome.svg" />
        </ThematicImage>
      </HeadingContainer>
    </SectionWithBackground>
  );
}
