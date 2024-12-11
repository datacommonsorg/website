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
 * A component to display a category of the knowledge graph
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { KnowledgeGraph } from "../../../shared/types/knowledge_graph";

interface KnowledgeGraphBrowserProps {
  //an object containing the categorized links that make up the knowledge graph
  knowledgeGraph: KnowledgeGraph;
}

export const KnowledgeGraphBrowser = ({
  knowledgeGraph,
}: KnowledgeGraphBrowserProps): ReactElement => {
  const theme = useTheme();
  return (
    <>
      {knowledgeGraph.map((category) => (
        <article
          key={category.title}
          css={css`
            padding-bottom: ${theme.spacing.huge}px;
            margin-bottom: ${theme.spacing.huge}px;
            border-bottom: 1px solid rgba(220, 220, 220, 0.3);
            &:last-of-type {
              border-bottom: none;
            }
          `}
        >
          <header
            css={css`
              margin-bottom: ${theme.spacing.lg}px;
            `}
          >
            <h3
              css={css`
                ${theme.typography.family.heading};
                ${theme.typography.heading.md};
              `}
            >
              {category.title}
            </h3>
          </header>
          <ul
            css={css`
              margin: 0;
              margin-left: 200px;
              padding: 0;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: ${theme.spacing.md}px ${theme.spacing.lg}px;
              @media (max-width: ${theme.breakpoints.lg}px) {
                margin-left: 100px;
              }
              @media (max-width: ${theme.breakpoints.md}px) {
                grid-template-columns: 1fr 1fr;
              }
              @media (max-width: ${theme.breakpoints.sm}px) {
                grid-template-columns: 1fr;
                margin-left: 10%;
              }
            `}
          >
            {category.items.map((item) => (
              <li
                key={item.endpoint}
                css={css`
                  ${theme.typography.family.text};
                  ${theme.typography.text.lg};
                  margin: 0;
                  padding: 0;
                  list-style: none;
                  display: block;
                `}
              >
                <a href={`/browser/${item.endpoint}`}>{item.label}</a>
              </li>
            ))}
            {category.categoryEndpoint && (
              <li
                css={css`
                  ${theme.typography.family.text};
                  ${theme.typography.text.lg};
                  margin: 0;
                  padding: 0;
                  list-style: none;
                  display: block;
                `}
              >
                <a
                  href={`/browser/${category.categoryEndpoint}`}
                  css={css`
                    ${theme.typography.family.text};
                    ${theme.typography.text.lg};
                    margin: 0;
                    padding: 0;
                    list-style: none;
                    display: flex;
                    align-content: center;
                    color: ${theme.colors.link.secondary.base};
                    &:hover {
                      color: ${theme.colors.link.secondary.dark};
                    }
                  `}
                >
                  & more
                </a>
              </li>
            )}
          </ul>
        </article>
      ))}
    </>
  );
};
