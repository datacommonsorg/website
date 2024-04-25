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

/** Styled Components for Icon Buttons */

import { styled } from "styled-components";

export const StyledButton = styled.button`
  align-items: center;
  background: var(--button-background-color, transparent);
  border: 1px solid #747775;
  border-radius: 100px;
  color: var(--button-text-color, black);
  display: flex;
  font-size: 14px;
  font-weight: 500;
  gap: 8px;
  justify-content: center;
  line-height: 20px;
  padding: 10px 24px 10px 16px;
  text-align: center;
  width: fit-content;

  &:hover {
    background-color: var(--button-highlight-background-color, transparent);
  }
  .icon {
    font-size: 18px;
  }
`;
