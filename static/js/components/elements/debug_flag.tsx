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
 * and a message is provided, then we display a flag with a tooltip that
 * displays the message. This can be used anywhere in the app to provide
 * short debugging messages to people in a debugging environment.
 */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { FlagFilled } from "./icons/flag";
import { Tooltip } from "./tooltip/tooltip";

const DEBUG_PARAM = "dbg";

interface DebugFlagProps {
  message: string;
}

export function DebugFlag({ message }: DebugFlagProps): ReactElement | null {
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

  if (hideDebug || !message) {
    return null;
  }

  return (
    <Tooltip
      title={message}
      triggerCss={css`
        cursor: pointer;
        padding: 0 ${theme.spacing.xs}px;
        &:hover {
          & > svg {
            transform: rotate(-20deg);
            color: ${theme.colors.error.primary.light};
          }
        }
      `}
    >
      <FlagFilled
        css={css`
          transition: transform 0.2s ease-in-out;
          color: ${theme.colors.error.primary.base};
        `}
      />
    </Tooltip>
  );
}
