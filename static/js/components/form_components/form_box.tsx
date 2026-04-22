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
 * Component for wrapping a set of form components in a card
 */

import { css, useTheme } from "@emotion/react";
import React from "react";

import { Box } from "../elements/wrappers/box";

interface FormBoxProps {
  // Child react components/elements to render in the box
  children?: React.ReactNode;
  // Whether to arrange children in a row or column layout
  flexDirection?: "row" | "column";
}

export function FormBox(props: FormBoxProps): JSX.Element {
  const theme = useTheme();
  const flexDirection = props.flexDirection || "row";
  return (
    <Box
      sx={css`
        ${flexDirection === "row" && "align-items: center;"}
        display: flex;
        flex-direction: ${flexDirection};
        flex-wrap: wrap;
        gap: ${theme.spacing.md}px;
        padding: ${theme.spacing.lg}px;
        ${theme.radius.secondary}
        width: 100%;
      `}
    >
      {props.children}
    </Box>
  );
}
