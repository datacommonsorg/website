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

import { css, useTheme } from "@emotion/react";
import React from "react";
import { useState } from "react";
import styled from "styled-components";

/**
 * Chip component to display a selected item with the ability to remove the item
 */
const ICON_PLACEHOLDER_DEFAULT_HEIGHT = 300;
const IconPlaceholderContainer = styled.div<{ $height?: number }>`
  align-items: center;
  background: var(--gm-3-ref-neutral-neutral-90);
  display: flex;
  height: ${(p): string => `${p.$height || ICON_PLACEHOLDER_DEFAULT_HEIGHT}px`};
  justify-content: center;
  width: 100%;
  .material-icons-outlined {
    color: var(--gm-3-ref-neutral-neutral-50);
  }
`;
export const IconPlaceholder = (props: {
  height?: number;
  iconName: string;
}): React.JSX.Element => {
  return (
    <IconPlaceholderContainer $height={props.height}>
      <span className="material-icons-outlined">{props.iconName}</span>
    </IconPlaceholderContainer>
  );
};

export const InfoTooltipComponent = (props: {
  icon_path: string;
  description: string;
}): React.JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useTheme();

  const InfoTooltip = styled.div`
    position: absolute;
    top: 25px;
    left: 0;
    background-color: ${theme.colors.background.secondary.light};
    border: 1px solid #ccc; /* Tooltip border */
    padding: 8px;
    border-radius: 4px;
    z-index: 1;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  `;

  const InfoTooltipContainerStyled = styled.div`
    position: relative;
    display: inline-block;
  `;

  const InfoTooltipImg = styled.img`
    font-size: ${theme.typography.text.md};
  `;
  const handleButtonClick = () => {
    setIsVisible(!isVisible);
  };

  return (
    <InfoTooltipContainerStyled>
      <InfoTooltipImg onClick={handleButtonClick} src={props.icon_path} />
      {isVisible && <InfoTooltip>{props.description}</InfoTooltip>}
    </InfoTooltipContainerStyled>
  );
};
