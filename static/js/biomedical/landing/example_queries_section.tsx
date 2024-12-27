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
 * Sample search queries section of the Biomedical DC landing page.
 */

import React from "react";
import { styled } from "styled-components";

import { CardProps } from "./card";
import { CardWall } from "./card_wall";
import {
  ContentContainer,
  SectionWithBackground,
} from "./shared_styled_components";

const StyledHeader = styled.h2`
  padding-bottom: 22px;
`;

interface ExampleQueriesSectionProps {
  cards: CardProps[][];
}

export function ExampleQueriesSection(
  props: ExampleQueriesSectionProps
): JSX.Element {
  return (
    <SectionWithBackground>
      <ContentContainer className="container">
        <StyledHeader>Sample questions you can find answers for</StyledHeader>
        <CardWall cards={props.cards} direction="column" />
      </ContentContainer>
    </SectionWithBackground>
  );
}
