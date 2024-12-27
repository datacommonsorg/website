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

export const BASE_URL = "https://datacommons.org/browser";

export type EmbeddingObject = {
  statVar: string;
  sentence: string;
  embeddings: number[];
};

export enum Override {
  NONE = "none",
  OLD = "old",
  NEW = "new",
}

export type MatchObject = {
  sentence: string;
  statVar: string;
  distance: number;
  override: Override;
};

function calculateRelevanceScores(baselineList: string[]): {
  [key: string]: number;
} {
  const numTokens = baselineList.length;
  return baselineList.reduce((acc, token, i) => {
    acc[token] = numTokens - i;
    return acc;
  }, {} as { [key: string]: number });
}

function dcg(scores: number[], k?: number): number {
  const numComparison = k || scores.length;
  // https://en.wikipedia.org/wiki/Discounted_cumulative_gain
  return scores.slice(0, numComparison).reduce((acc, score, idx) => {
    return acc + (Math.pow(2, score) - 1) / Math.log2(idx + 2);
  }, 0);
}

export function ndcg(newList: string[], baselineList: string[]): number {
  const relevanceScores = calculateRelevanceScores(baselineList);
  const newScores = newList.map((token) => relevanceScores[token] || 0);
  const baselineScores = baselineList.map((token) => relevanceScores[token]);
  const dcgNew = dcg(newScores);
  const dcgBase = dcg(baselineScores);
  return dcgBase > 0 ? dcgNew / dcgBase : 0;
}

export function accuracy(newList: string[], baselineList: string[]): number {
  const baseLineSet = new Set(baselineList);
  let numMatch = 0;
  for (const token of newList.slice(0, baselineList.length)) {
    if (baseLineSet.has(token)) {
      numMatch += 1;
    }
  }
  return numMatch / baselineList.length;
}
