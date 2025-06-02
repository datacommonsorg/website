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
 * Data sources section of the Biomedical DC landing page.
 */

import React from "react";
import { styled } from "styled-components";

import { ContentContainer, TextBlock } from "./shared_styled_components";

const UnderlinedLink = styled.a`
  text-decoration-line: underline;
`;

const ExploreStructureLink = styled.a`
  align-items: center;
  display: flex;
  gap: 8px;

  &:hover {
    text-decoration: none;
  }
`;

export function DataSourcesSection(): JSX.Element {
  return (
    <ContentContainer className="container">
      <h2>Data Sources</h2>
      <TextBlock className="row">
        <div className="col-lg-8">
          <p>
            The Biomedical Data Commons is a comprehensive repository that
            integrates data from over{" "}
            <UnderlinedLink href="https://datacommons.org/data/biomedical">
              18 different trusted sources
            </UnderlinedLink>{" "}
            like NIH NCBI and EMBL-EBI. Including commonly used open-source
            datasets such as ChEMBL, ClinVar, Gene, GTEx, MeSH, PharmGKB, and
            UniProt. This collaborative effort unifies and harmonizes diverse
            biomedical data, enabling innovative research that transcends the
            limitations of isolated sources.
          </p>
        </div>
        <div className="col-lg-4">
          This collaborative effort unifies and harmonizes diverse biomedical
          data, enabling innovative research that transcends the limitations of
          isolated sources.
        </div>
      </TextBlock>
      <ExploreStructureLink
        href="/browser/bio"
        className="explore-structure-link"
      >
        <span className="material-icons-outlined">account_tree</span>
        Explore the structure
      </ExploreStructureLink>
    </ContentContainer>
  );
}
