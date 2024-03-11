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

import React, { useState } from "react";

import { SearchResult } from "./search_result";
import { BASE_URL, EmbeddingObject } from "./util";

export interface SentenceSectionProps {
  sentence: string;
  modelNames: string[];
  goldenStatVars: string[];
  overrideStatVars: Record<string, EmbeddingObject[]>;
}

export function SentenceSection(props: SentenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleTableVisibility = () => {
    setIsExpanded(!isExpanded);
  };
  return (
    <div className="setence-container">
      <h3>{props.sentence}</h3>
      <button onClick={toggleTableVisibility}>
        {isExpanded ? "Collapse" : "Expand"}
      </button>
      <div className="model-result-container">
        <div className="search-result">
          <div className="golden-label">Golden Stat Vars</div>
          <ul>
            {props.goldenStatVars.map((statVar) => {
              return (
                <li className="matched-sv" key={statVar}>
                  <a
                    href={`${BASE_URL}/${statVar}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {statVar}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        {props.modelNames.map((modelName) => {
          return (
            <SearchResult
              key={modelName}
              sentence={props.sentence}
              modelName={modelName}
              isExpanded={isExpanded}
              goldenStatVars={props.goldenStatVars}
              overrideStatVars={props.overrideStatVars[modelName]}
            />
          );
        })}
      </div>
    </div>
  );
}
