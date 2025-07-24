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
/** @jsxImportSource @emotion/react */

/**
 * Wall of links to example charts for the visualization tools
 */

import { css, useTheme } from "@emotion/react";
import React from "react";

import { Button } from "../../../components/elements/button/button";
import { ArrowForward } from "../../../components/elements/icons/arrow_forward";

interface LinkSpecs {
  text: string;
  url: string;
}

interface ChartLinkWallProps {
  links: LinkSpecs[];
}

export function ChartLinkWall(props: ChartLinkWallProps): JSX.Element {
  const theme = useTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.lg}px;
        padding: ${theme.spacing.lg}px;
      `}
    >
      <div
        css={css`
          ${theme.typography.heading.xs}
        `}
      >
        Need ideas? Try these:
      </div>
      <div
        css={css`
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: ${theme.spacing.md}px;
        `}
      >
        {props.links.map((element) => (
          <Button
            key={element.url}
            variant="flat"
            startIcon={<ArrowForward />}
            size="sm"
            href={element.url}
            css={css`
              background-color: ${theme.colors.button.secondary.base};
              color: ${theme.colors.button.secondary.dark};
              .button-start-icon {
                ${theme.typography.text.lg}
              }
            `}
          >
            {element.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
