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

interface SectionProps {
  //a variant that determines the vertical (y) padding of the section
  variant?: "standard" | "small" | "large" | "compact";
  //a variant that determines the background color of the section
  colorVariant?: "base" | "light" | "dark";
  //prop to allow the optional addition to an overriding of attributes that style the primary section container.
  sx?: Interpolation<Theme>;
  //prop to allow the optional addition to an overriding of attributes that style the inner section container.
  innerSx?: Interpolation<Theme>;
  //the content of the section
  children?: ReactNode;
}

export const Section = ({
  colorVariant = "base",
  variant = "standard",
  sx,
  innerSx,
  children,
}: SectionProps): ReactElement => {
  const theme = useTheme();
  const color = theme.colors.background.primary[colorVariant ?? "base"];

  const padding =
    variant === "large"
      ? theme.sections.large
      : variant === "small"
      ? theme.sections.small
      : variant === "compact"
      ? theme.sections.compact
      : theme.sections.standard;

  return (
    <section
      css={[
        css`
          background-color: ${color};
        `,
        sx,
      ]}
    >
      <div
        css={[
          css`
            margin: auto;
            width: 100%;
            max-width: ${theme.width.xl}px;
            padding: ${padding}px 0;
            @media (max-width: ${theme.breakpoints.xl}px) {
              padding: ${padding}px ${theme.spacing.lg}px;
            }
            @media (max-width: ${theme.breakpoints.lg}px) {
              max-width: ${theme.width.lg}px;
            }
            @media (max-width: ${theme.breakpoints.md}px) {
              max-width: 100%;
            }
            @media (max-width: ${theme.breakpoints.sm}px) {
              padding: ${theme.spacing.xl}px ${theme.spacing.lg}px;
            }
          `,
          innerSx,
        ]}
      >
        {children}
      </div>
    </section>
  );
};
