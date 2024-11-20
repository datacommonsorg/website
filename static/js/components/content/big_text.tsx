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
 * A component to display a large bold text section
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface BigTextProps {
  //the content that will be displayed inside the text section
  children: ReactElement;
}

export const BigText = ({ children }: BigTextProps): ReactElement => {
  const theme = useTheme();
  return (
    <article
      css={css`
        width: 100%;
        max-width: ${theme.width.md}px;
        @media (max-width: ${theme.breakpoints.md}px) {
          max-width: 100%;
        }
      `}
    >
      <h3
        css={css`
          ${theme.typography.family.heading};
          ${theme.typography.heading.sm};
          color: ${theme.colors.text.primary.light};
        `}
      >
        {children}
      </h3>
    </article>
  );
};
