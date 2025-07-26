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
 * If hideDebug is false (the same flag that the general debug tool uses),
 * then we display a flag if the chart is in grouped mode and not all of
 * the facets are completely shared across the stat vars.
 */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { FlagFilled } from "../../components/elements/icons/flag";
import { Tooltip } from "../../components/elements/tooltip/tooltip";

const DEBUG_PARAM = "dbg";

interface FacetSelectorDebugFlagProps {
  message: string;
}

export function FacetSelectorDebugFlag({
  message,
}: FacetSelectorDebugFlagProps): ReactElement | null {
  const theme = useTheme();

  const getDebugParam = (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.hash.slice(1)).get(DEBUG_PARAM);
  };

  const debugParam = getDebugParam();

  const hideDebug =
    !document.getElementById("metadata") ||
    !document.getElementById("metadata").dataset ||
    (document.getElementById("metadata").dataset.hideDebug !== "False" &&
      !debugParam);

  if (hideDebug) {
    return null;
  }

  return (
    <Tooltip title={message}>
      <FlagFilled
        css={css`
          color: ${theme.colors.box.red.text};
        `}
      />
    </Tooltip>
  );
}
