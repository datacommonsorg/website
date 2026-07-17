/**
 * Copyright 2026 Google LLC
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
 * PlaceTag component to display a single selected place with the ability to
 * remove the selection. Visually distinct outlined-pill variant of Chip,
 * intended for single-select place pickers.
 */

import { css, useTheme } from "@emotion/react";
import React from "react";

interface PlaceTagPropsType {
  // Id of the item the tag is being shown for
  id: string;
  // Title to show in the tag
  title: string;
  // Callback function when tag is removed
  removeChip: (id: string) => void;
  // When tag text is clicked
  onTextClick?: () => void;
}

export function PlaceTag(props: PlaceTagPropsType): JSX.Element {
  const theme = useTheme();
  return (
    <button
      className="place-tag"
      css={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: ${theme.spacing.sm}px;
        padding: ${theme.spacing.xs}px;
        cursor: pointer;
        background: none;
        border: 0;
      `}
      onClick={(): void => props.removeChip(props.id)}
    >
      {props.title}
      <i
        className="material-icons"
        css={css`
          font-size: 16px;
          color: ${theme.colors.text.tertiary.base};
        `}
      >
        cancel
      </i>
    </button>
  );
}
