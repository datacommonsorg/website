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
 * A component to display the columned hero component.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface HeroColumnsProps {
  //the content of the two hero columns, given as slot props:
  //<TextColumns.Left>...</TextColumns.Left><TextColumns.Right>...</TextColumns.Right>
  children: ReactElement | ReactElement[];
  variant?: "half" | "left" | "right";
}

interface HeroColumnsSlotProps {
  //the content that populates either of the two columns
  children: ReactElement | ReactElement[] | string;
}

const HeroColumnsLeft = ({ children }: HeroColumnsSlotProps): ReactElement => {
  return <header id="hero">{children}</header>;
};

const HeroColumnsRight = ({ children }: HeroColumnsSlotProps): ReactElement => {
  return <div>{children}</div>;
};

export const HeroColumns = ({
  children,
  variant = "half",
}: HeroColumnsProps): ReactElement => {
  const theme = useTheme();

  const layout =
    variant === "left"
      ? "4fr 6fr"
      : variant === "right"
      ? "6fr 4fr"
      : "5fr 5fr";

  return (
    <article
      css={css`
        display: grid;
        grid-template-columns: ${layout};
        gap: ${theme.spacing.xl}px;
        align-items: center;
        @media (max-width: ${theme.breakpoints.sm}px) {
          grid-template-columns: 1fr;
        }
      `}
    >
      {children}
    </article>
  );
};

HeroColumns.Left = HeroColumnsLeft;
HeroColumns.Right = HeroColumnsRight;
