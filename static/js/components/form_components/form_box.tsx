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

export function FormBox(props: { children?: React.ReactNode }): JSX.Element {
  const theme = useTheme();
  return (
    <Box
      sx={css`
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: ${theme.spacing.sm}px;
        padding: ${theme.spacing.lg}px;
        ${theme.radius.secondary}
        width: 100%;
      `}
    >
      {props.children}
    </Box>
  );
}
