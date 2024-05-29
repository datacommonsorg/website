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

import _ from "lodash";
import React from "react";

export function OverallScoreTable(props: {
  // keyed by model name and sentence, value is score
  data: Record<string, Record<string, number>>;
}): JSX.Element {
  return (
    <table className="overall-score-table">
      <thead>
        <tr>
          <th>Model Name</th>
          <th>Total Average Score</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(props.data).map((modelName) => {
          const scoreArray = Object.values(props.data[modelName]);
          const meanScore = _.mean(scoreArray).toFixed(3);
          return (
            <tr key={modelName}>
              <td>{modelName}</td>
              <td>{meanScore}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
