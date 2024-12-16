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
 * Clickable cards for the Biomedical DC landing page
 */

import React from "react";
import styled from "styled-components";

import { BREAKPOINTS } from "./constants";

const CardContainer = styled.a`
  align-items: flex-start;
  background: #f8fafd;
  border-radius: 32px;
  box-shadow: 0px 1px 3px 1px rgba(0, 0, 0, 0.15),
    0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 24px;
  justify-content: space-between;
  padding: 24px;
  width: 100%;

  &:hover {
    cursor: pointer;
    text-decoration: none;
  }
`;

const Text = styled.div`
  color: ${(props) => props.theme.textColor || "#146C2E"};
  font-size: 24px;
  font-weight: 400;
  line-height: 32px;
  text-align: left;

  @media ${BREAKPOINTS.md} {
    font-size: 20px;
    line-height: 28px;
  }
`;

const Tag = styled.div`
  align-items: center;
  background-color: ${(props) =>
    props.theme.tagBackgroundColor || "#C4EED0"};
  border-radius: 28px;
  color: ${(props) => props.theme.tagLabelColor || "#072711"};
  display: flex;
  font-size: 12px;
  font-weight: 500;
  gap: 4px;
  justify-content: flex-start;
  letter-spacing: 0.5px;
  line-height: 16px;
  padding: 2px 8px;

  .icon {
    font-size: 14px;
    width: 14px;
  }
`;

export interface CardTheme {
  // CSS color to use for tag
  tagBackgroundColor?: string;
  // CSS color to use for label on tag
  tagLabelColor?: string;
  // CSS color of main text
  textColor?: string;
}

export interface CardProps {
  // Whether to open link in a new tab. Default: false
  openInNewTab?: boolean;
  // tag or category to label card with
  tag: string;
  // styling options
  theme: CardTheme;
  // main text to display on card
  text: string;
  // url to link to when card is clicked
  url: string;
}

export function Card(props: CardProps): JSX.Element {
  return (
    <CardContainer href={props.url} target={props.openInNewTab ? "_blank" : ""}>
      <Text theme={props.theme}>{props.text}</Text>
      <Tag theme={props.theme}>
        {props.tag}
        {props.openInNewTab && (
          <span className="material-icons-outlined icon">open_in_new</span>
        )}
      </Tag>
    </CardContainer>
  );
}
