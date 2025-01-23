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
 * A tab panel that contains the content (the body) of a particular tab.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, ReactNode } from "react";

import { useTabContext } from "./tab_context";

interface TabPanelProps {
  // the route of the tab panel component:
  // used to connect tab panels with their tab selector buttons
  route: string | number;
  // the content of the tab panel
  children: ReactNode;
}

export const TabPanel = ({ route, children }: TabPanelProps): ReactElement => {
  const { route: selectedRoute } = useTabContext();
  const theme = useTheme();

  if (selectedRoute !== route) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${route}`}
      aria-labelledby={`tab-${route}`}
      css={css`
        padding: ${theme.spacing.xl}px 0;
      `}
    >
      {children}
    </div>
  );
};
