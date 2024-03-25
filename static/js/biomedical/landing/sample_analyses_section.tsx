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
 * Sample Analyses section of the Biomedical DC landing page.
 */

import React from "react";

import { CardProps } from "./card";
import { CardWall } from "./card_wall";
import { ContentContainer, TextBlock } from "./shared_styled_components";

interface SampleAnalysesSectionProps {
  cards: CardProps[][];
}

export function SampleAnalysesSection(
  props: SampleAnalysesSectionProps
): JSX.Element {
  return (
    <ContentContainer className="container">
      <h2>Spend less time wrangling data, more time on research</h2>
      <TextBlock className="row">
        <div className="col-lg-8">
          <p>
            The Biomedical Data Commons streamlines biological research by
            overcoming data fragmentation. It cleans, joins, and stores data in
            a unified knowledge graph, providing researchers with improved
            access to information from multiple biomedical fields in a machine-
            and human-readable format. This enhanced accessibility simplifies
            the analysis of complex systems. See how this works in the Python
            notebooks below.
          </p>
        </div>
        <div className="col-lg-4" />
      </TextBlock>
      <CardWall cards={props.cards} direction="row" />
    </ContentContainer>
  );
}
