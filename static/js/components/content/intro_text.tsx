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
 * A component to display a simple text block
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface IntroTextProps {
  //the content (text or other content) as a React element
  children: ReactElement;
}

export const IntroText = ({ children }: IntroTextProps): ReactElement => {
  const theme = useTheme();
  return (
    <header
      css={css`
        width: 100%;
        max-width: ${theme.width.md}px;
        @media (max-width: ${theme.breakpoints.md}px) {
          max-width: 100%;
        }
        h2,
        h1 {
          ${theme.typography.family.heading}
          ${theme.typography.heading.xl}
          margin-bottom: ${theme.spacing.xl}px;
        }
        p {
          ${theme.typography.family.text}
          ${theme.typography.text.md}
        }
      `}
    >
      {children}
    </header>
  );
};
