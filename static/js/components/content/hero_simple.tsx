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
 * A component to display the primary video hero component
 */
/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface SimpleHeroProps {
  //the content to be displayed alongside the video
  children: ReactElement;
}

export const HeroSimple = ({ children }: SimpleHeroProps): ReactElement => {
  const theme = useTheme();
  return (
    <article
      id="hero"
      css={css`
        width: 100%;
        max-width: ${theme.width.sm}px;
        @media (max-width: ${theme.breakpoints.md}px) {
          max-width: 100%;
        }
      `}
    >
      {children}
    </article>
  );
};
