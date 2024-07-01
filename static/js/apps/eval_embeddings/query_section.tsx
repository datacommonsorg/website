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

import React from "react";

import { IndexScoreBox } from "./index_score_box";
import { EmbeddingObject } from "./util";

export interface QuerySectionProps {
  sentence: string;
  indexes: Record<string, Record<string, string>>;
  models: Record<string, Record<string, string | number>>;
  description: Record<string, EmbeddingObject[]>;
}

export function QuerySection(props: QuerySectionProps): JSX.Element {
  return (
    <div className="query-section">
      <h3>{props.sentence}</h3>
      <div className="model-result-container">
        {Object.keys(props.indexes).map((indexName) => {
          const modelName = props.indexes[indexName].model;
          return (
            <IndexScoreBox
              key={indexName}
              sentence={props.sentence}
              indexName={indexName}
              modelName={modelName}
              modelScoreThreshold={Number(
                props.models[modelName].score_threshold
              )}
              overrideStatVars={props.description[modelName]}
            />
          );
        })}
      </div>
    </div>
  );
}
