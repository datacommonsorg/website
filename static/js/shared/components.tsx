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

import styled from "@emotion/styled";
import React from "react";

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
