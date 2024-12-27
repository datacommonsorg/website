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
 * A page separator that adds either space and or border to a page.
 * The spacing is in the same proportions as the section components.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface SeparatorProps {
  //a variant that determines the vertical (y) padding added to the page
  variant?: "standard" | "small" | "large" | "compact";
  //a variant that determines the visibility of the border - defaults to true
  border?: boolean;
}

export const Separator = ({
  variant = "compact",
  border = true,
}: SeparatorProps): ReactElement => {
  const theme = useTheme();

  const padding =
    variant === "large"
      ? theme.sections.large
      : variant === "small"
      ? theme.sections.small
      : variant === "compact"
      ? theme.sections.compact
      : theme.sections.standard;

  return (
    <div
      css={css`
        margin: auto;
        width: 100%;
        max-width: ${theme.width.xl}px;
        padding: ${padding}px ${theme.spacing.lg}px;
        border-bottom: ${border === false ? "0" : "1px"} solid
          ${theme.colors.border.primary.light};
        @media (max-width: ${theme.breakpoints.xl}px) {
          padding: ${padding}px ${theme.spacing.lg}px;
        }
        @media (max-width: ${theme.breakpoints.lg}px) {
          max-width: ${theme.width.lg}px;
        }
        @media (max-width: ${theme.breakpoints.md}px) {
          max-width: 100%;
        }
      `}
    ></div>
  );
};
