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
 * A page section that defines a block of content with standard spacing,
 * widths and colors.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, ReactNode } from "react";

interface SectionProps {
  //a variant that determines the vertical (y) padding of the section
  variant?: "standard" | "large" | "compact";
  //a variant that determines the background color of the section
  colorVariant?: "base" | "light" | "dark";
  //the content of the section
  children?: ReactNode;
}

export const Section = ({
  colorVariant = "base",
  variant = "standard",
  children,
}: SectionProps): ReactElement => {
  const theme = useTheme();
  const color = theme.colors.background.primary[colorVariant ?? "base"];

  const padding =
    variant === "large"
      ? theme.sections.large
      : variant === "compact"
      ? theme.sections.compact
      : theme.sections.standard;

  return (
    <section
      css={css`
        background-color: ${color};
      `}
    >
      <div
        css={css`
          margin: auto;
          width: 100%;
          max-width: ${theme.width.xl}px;
          padding: ${padding}px 0;
          @media (max-width: ${theme.breakpoints.xl}px) {
            padding: ${variant === "compact" ? "0" : padding}px
              ${theme.spacing.lg}px;
          }
          @media (max-width: ${theme.breakpoints.lg}px) {
            max-width: ${theme.width.lg}px;
          }
          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }
        `}
      >
        {children}
      </div>
    </section>
  );
};
