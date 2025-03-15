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
 * A component that renders a link icon box - a component that
 * displays a link inside a large Material Design-style rounded box,
 * decorated with an icon.
 */

/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import React from "react";
import { intl } from "../../i18n/i18n";
import { messages } from "../../i18n/i18n_messages";
import { ProgressActivity } from "./icons/progress_activity";

/**
 * Loading indicator component
 */
export const Loading = () => {
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        svg {
          margin-right: 0.25em;
        }
      `}
    >
      <ProgressActivity /> {intl.formatMessage(messages.loading)}
    </div>
  );
};
