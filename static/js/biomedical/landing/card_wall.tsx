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
 * A grid of clickable Cards for the Biomedical DC landing page
 */

import React from "react";
import styled from "styled-components";

import { Card, CardProps } from "./card";
import { BREAKPOINTS } from "./constants";

const CardContainer = styled.div`
  width: 100%;
`;

const Column = styled.div`
  display: flex;
  flex-basis: 100%;
  flex-direction: column;
  gap: 24px;
`;

const Row = styled.div`
  display: flex;
  flex-basis: 100%;
  flex-direction: row;
  gap: 24px;

  @media ${BREAKPOINTS.md} {
    flex-wrap: wrap;
  }
`;

const WallContainer = styled.div`
  display: flex;
  gap: 24px;

  @media ${BREAKPOINTS.md} {
    flex-wrap: wrap;
  }
`;

interface CardStackProps {
  // Specs of cards in the stack
  cardSpecs: CardProps[];
  // Direction to stack. Defaults to "row".
  direction?: "column" | "row";
}

interface CardWallProps {
  // Stacks of cards to show
  cards: CardProps[][];
  // Direction to lay out each stack of cards
  // Defaults to "row".
  direction?: "row" | "column";
}

/** A single row or column in the wall of cards */
function CardStack(props: CardStackProps): JSX.Element {
  const cards = props.cardSpecs.map((card, index) => {
    return (
      <CardContainer key={`CardContainer-${index}`}>
        <Card
          key={`Card-${index}`}
          openInNewTab={card.openInNewTab}
          tag={card.tag}
          theme={card.theme}
          text={card.text}
          url={card.url}
        />
      </CardContainer>
    );
  });
  if (props.direction == "column") {
    return <Column>{cards}</Column>;
  } else {
    return <Row>{cards}</Row>;
  }
}

/** A tiled wall of Cards */
export function CardWall(props: CardWallProps): JSX.Element {
  return (
    <WallContainer>
      {props.cards.map((cardSpecs, index) => {
        return (
          <CardStack
            cardSpecs={cardSpecs}
            direction={props.direction}
            key={`CardStack-${index}`}
          />
        );
      })}
    </WallContainer>
  );
}
