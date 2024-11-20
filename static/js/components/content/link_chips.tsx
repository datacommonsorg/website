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
 * A component that renders a block of link chips (Material Design-inspired
 * chips that act as links
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Link, LinkChip } from "../elements/link_chip";

interface LinkChipsProps {
  //the variant of the link chip to display: elevated is a raised grey chip and flat is a flat blue chip
  variant?: "elevated" | "flat";
  //the title of the component, displayed as a header above the chips
  title?: string;
  //the section gives location of the chip component in order to give context for the GA event
  section: string;
  //an array of links to be rendered by the component
  linkChips: Link[];
}

export const LinkChips = ({
  variant = "elevated",
  title,
  section,
  linkChips,
}: LinkChipsProps): ReactElement => {
  const theme = useTheme();
  return (
    <>
      {title && (
        <h3
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.heading.xs};
            margin-bottom: ${theme.spacing.lg}px;
          `}
        >
          {title}
        </h3>
      )}
      <div
        css={css`
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          max-width: 80%;
          gap: ${theme.spacing.md}px;
          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }
        `}
      >
        {linkChips.map((linkChip) => (
          <LinkChip
            key={linkChip.id}
            variant={variant}
            section={section}
            linkChip={linkChip}
          />
        ))}
      </div>
    </>
  );
};
