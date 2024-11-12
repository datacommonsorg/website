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
 * A utility component used by higher-level components to wrap themselves
 * with standard spacing, widths and colors.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, ReactNode } from "react";

interface WrapperProps {
  colorVariant?: "base" | "light" | "dark";
  children?: ReactNode;
}

export const Wrapper = ({
  colorVariant = "base",
  children,
}: WrapperProps): ReactElement => {
  const theme = useTheme();

  const background =
    colorVariant === "light"
      ? theme.colors.background.alpha.light
      : colorVariant === "dark"
      ? theme.colors.background.alpha.dark
      : theme.colors.background.alpha.base;

  return (
    <section
      css={css`
        background: ${background};
      `}
    >
      <div
        css={css`
          margin: auto;
          width: 100%;
          max-width: ${theme.width.xl}px;
          padding: ${theme.spacing.section}px 0;
          @media (max-width: ${theme.breakpoints.xl}px) {
            padding: ${theme.spacing.section}px ${theme.spacing.lg}px;
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
