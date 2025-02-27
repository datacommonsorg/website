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

import { Theme } from "@emotion/react";
import styled from "@emotion/styled";
import React, { useState } from "react";

import theme from "../theme/theme";

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

const InfoTooltip = styled.div<{ theme?: Theme }>`
  ${(p) => p.theme?.typography?.text?.sm}
  position: absolute;
  min-width: 312px;
  top: ${(p) => p.theme.spacing.lg}px;
  left: 0;
  background-color: ${(p) => p.theme.colors.background.secondary.light};
  border: 1px solid ${(p) => p.theme.colors.border.primary.light};
  border-radius: ${(p) => p.theme.radius.secondary.borderRadius};
  padding: ${(p) => p.theme.spacing?.md}px ${(p) => p.theme.spacing.lg}px;
  z-index: 1;
  box-shadow: ${(p) => p.theme.elevation.secondary.boxShadow};

  @media (max-width: 768px) {
    left: 50%;
    transform: translateX(-50%);
  }
`;

const InfoTooltipContainerStyled = styled.div<{ theme?: Theme }>`
  position: relative;
  display: inline-block;
`;

export const InfoTooltipComponent = (props: {
  icon: React.JSX.Element;
  description: string;
}): React.JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const handleShow = (): void => {
    setIsVisible(true);
  };

  const handleHide = (): void => {
    setIsVisible(false);
  };

  return (
    <InfoTooltipContainerStyled
      theme={theme}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onTouchStart={handleShow}
      onTouchEnd={handleHide}
      onTouchCancel={handleHide}
    >
      {props.icon}
      {isVisible && (
        <InfoTooltip theme={theme} className="info-tooltip-hover">
          {props.description}
        </InfoTooltip>
      )}
    </InfoTooltipContainerStyled>
  );
};
