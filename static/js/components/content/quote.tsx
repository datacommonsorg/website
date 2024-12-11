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
 * A component to display a splash quote
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface QuoteProps {
  //a variant that determines the alignment
  alignment?: "left" | "center" | "right";
  //the quote content
  quote: string;
  //the person or organization responsible for the quote
  byline: string;
}

const Quote = ({
  alignment = "center",
  quote,
  byline,
}: QuoteProps): ReactElement => {
  const theme = useTheme();

  return (
    <article
      css={css`
        text-align: ${alignment};
      `}
    >
      <blockquote
        css={css`
          ${theme.typography.family.heading};
          ${theme.typography.heading.lg};
          @media (max-width: ${theme.breakpoints.sm}px) {
            ${theme.typography.heading.sm};
          }
        `}
      >
        “{quote}”
      </blockquote>
      <p
        css={css`
          ${theme.typography.family.text};
          ${theme.typography.text.lg};
        `}
      >
        - {byline}
      </p>
    </article>
  );
};

export default Quote;
