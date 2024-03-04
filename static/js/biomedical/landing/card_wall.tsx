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
 * Sample Question Card Wall for the Biomedical DC landing page
 */

import React from "react";
import styled from "styled-components";

import { Card, CardProps } from "./card";

const Column = styled.div`
  display: flex;
  flex-basis: 100%;
  flex-direction: column;
  gap: 24px;
`;

const Container = styled.div`
  display: flex;
  gap: 24px;
`;

const Row = styled.div`
  display: flex;
  flex-basis: 100%;
  flex-direction: row;
  gap: 24px;
`;

interface CardStackProps {
  // Direction to stack. One of "row" or "column". Defaults to "row".
  direction?: string;
  // Specs of cards in the stack
  cardSpecs: CardProps[];
}

interface CardWallProps {
  // List of cardSpecs for each of the CardStacks that make up the wall
  cards: CardProps[][];
  // Direction to group categories by.
  // One of "row" or "column". Defaults to "row".
  direction: string;
}

/** A single row or column in the wall of cards */
function CardStack(props: CardStackProps): JSX.Element {
  const cards = props.cardSpecs.map((card, index) => {
    return (
      <Card
        key={`Card-${index}`}
        tag={card.tag}
        theme={card.theme}
        text={card.text}
        url={card.url}
      />
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
    <Container>
      {props.cards.map((cardSpecs, index) => {
        return (
          <CardStack
            cardSpecs={cardSpecs}
            direction={props.direction}
            key={`CardStack-${index}`}
          />
        );
      })}
    </Container>
  );
}
