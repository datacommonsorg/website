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
 * Search component for arbitrary embedding on a page (such as the home page).
 */

/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import React, { Children, ReactElement, ReactNode } from "react";

import { localizeLink } from "../../i18n/i18n";
import theme from "../../theme/theme";
import { NlSearchBar } from "../nl_search_bar";

export interface SearchProps {
  // Pre-fill text in the search box (overrides URL hash).
  query?: string;
  // Debug data forwarded to <SearchSection/> (optional).
  debugData?: any;
  // Custom explore context; derived from URL if omitted.
  exploreContext?: any;
  // Custom class name for the outer <div>.
  className?: string;
  // Optional Markdown/JSX shown as an introduction above the search bar.
  children?: ReactNode;
}

export function Search({ className, children }: SearchProps): ReactElement {
  const hasIntro = Children.count(children) > 0;

  return (
    <div
      className={className}
      css={css`
        width: 100%;

        & > header {
          width: 100%;
          max-width: ${theme.width.sm}px;
          margin-bottom: ${theme.spacing.xl}px;

          @media (max-width: ${theme.breakpoints.md}px) {
            max-width: 100%;
          }

          & > h3 {
            ${theme.typography.family.heading};
            ${theme.typography.heading.md};
            margin-bottom: ${theme.spacing.xl}px;
          }

          & > p {
            ${theme.typography.family.text};
            ${theme.typography.text.lg};
          }
        }
      `}
    >
      {hasIntro && <header>{children}</header>}
      <NlSearchBar
        inputId="query-search-input"
        onSearch={(q): void => {
          const localizedUrl = localizeLink(`/explore`);
          window.location.href = `${localizedUrl}#q=${encodeURIComponent(q)}`;
        }}
        initialValue={""}
        shouldAutoFocus={false}
        variant="standard"
      />
    </div>
  );
}

export default Search;
