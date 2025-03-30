/**
 * Copyright 2025 Google LLC
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
 * A page section that defines a block of content with standard spacing,
 * widths and colors.
 */

/** @jsxImportSource @emotion/react */

import { css, Theme, useTheme } from "@emotion/react";
import { Interpolation } from "@emotion/styled";
import React, { ReactElement, ReactNode } from "react";

interface BoxProps {
  //a variant that determines the background color of the section
  colorVariant?: "base" | "light" | "dark";
  //prop to allow the optional addition to an overriding of attributes that style the primary section container.
  sx?: Interpolation<Theme>;
  //the content of the section
  children?: ReactNode;
}

export const Box = ({
  colorVariant = "base",
  sx,
  children,
}: BoxProps): ReactElement => {
  const theme = useTheme();
  const color = theme.colors.background.primary[colorVariant ?? "base"];

  return (
    <div
      css={[
        css`
          ${theme.radius.tertiary}
          background-color: ${color};
          border: 1px solid ${theme.colors.border.primary.light};
          width: 100%;
          padding: ${theme.spacing.lg}px;
        `,
        sx,
      ]}
    >
      {children}
    </div>
  );
};
