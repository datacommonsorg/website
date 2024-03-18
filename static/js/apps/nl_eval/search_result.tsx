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

import axios from "axios";
import React, { useEffect, useState } from "react";

import { stringifyFn } from "../../utils/axios";
import { accuracy, BASE_URL, EmbeddingObject, MatchObject } from "./util";

const NEW_MATCH_COUNT = 5;

interface StatVar {
  dcid: string;
  rank: number;
  scores: number[];
}

interface SearchResultProps {
  sentence: string;
  modelName: string;
  isExpanded: boolean;
  goldenStatVars: string[];
  overrideStatVars: EmbeddingObject[];
}

function dotProduct(a: number[], b: number[]): number {
  // We expect same length vector for dot product.
  if (a.length !== b.length) {
    return NaN;
  }
  return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
}

function findKNearestEmbeddings(
  targetEmbedding: number[],
  objects: EmbeddingObject[],
  k: number
): MatchObject[] {
  const result = [];
  for (const emb of objects) {
    const dist = dotProduct(emb.embeddings, targetEmbedding);
    result.push({
      distance: dist,
      sentence: emb.sentence,
      statVar: emb.statVar,
    });
  }
  result.sort((a, b) => a.distance - b.distance);
  return result.slice(0, k);
}

export function SearchResult(props: SearchResultProps): JSX.Element {
  const [statVarMatch, setStatVarMatch] = useState<MatchObject[]>([]);
  const [rankedStatVars, setRankedStatVars] = useState<StatVar[]>([]);

  useEffect(() => {
    (async () => {
      const data = await fetchData(props.sentence, props.modelName);
      const embeddings = data["embeddings"];
      let matches: MatchObject[] = data["matches"];
      const originalMatchCount = matches.length;
      // Use override stat var embeddings
      if (props.overrideStatVars) {
        const overrideSV = new Set(
          props.overrideStatVars.map((x) => x.statVar)
        );
        matches = matches.filter((x) => !overrideSV.has(x.statVar));
        let newMatchCount = originalMatchCount - matches.length;
        if (newMatchCount == 0) {
          newMatchCount = NEW_MATCH_COUNT;
        }
        const overrideMatches = findKNearestEmbeddings(
          embeddings,
          props.overrideStatVars,
          newMatchCount
        );
        overrideMatches.filter(
          (x) => !(x.distance > matches.slice(-1)[0].distance)
        );
        matches = matches.concat(overrideMatches);
        matches.sort((a, b) => b.distance - a.distance);
      }

      const statVarInfo: Record<string, StatVar> = {};
      for (const item of matches) {
        if (item.statVar in statVarInfo) {
          statVarInfo[item.statVar].scores.push(item.distance);
        } else {
          statVarInfo[item.statVar] = {
            dcid: item.statVar,
            rank: Object.keys(statVarInfo).length,
            scores: [item.distance],
          };
        }
      }
      const rankedStatVarMatch = Object.values(statVarInfo).sort((a, b) => {
        return a.rank - b.rank;
      });

      setStatVarMatch(matches);
      setRankedStatVars(rankedStatVarMatch);
    })();
  }, [
    props.goldenStatVars,
    props.sentence,
    props.modelName,
    props.overrideStatVars,
  ]);

  const evalScore = accuracy(
    rankedStatVars.map((x) => x.dcid),
    props.goldenStatVars
  );

  return (
    <div className="search-result">
      <div className="model-name">
        {props.modelName}{" "}
        <span className="eval-score">(accuracy: {evalScore.toFixed(2)})</span>
      </div>
      <p>Matched stat vars with top 2 cosine scores</p>
      <ul>
        {rankedStatVars.map((svItem) => {
          return (
            <li key={svItem.dcid}>
              <a
                className={
                  props.goldenStatVars.includes(svItem.dcid) ? "matched-sv" : ""
                }
                href={`${BASE_URL}/${svItem.dcid}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {svItem.dcid}
              </a>
              {` (${svItem.scores
                .slice(0, 2)
                .map((score) => score.toFixed(3))
                .join(", ")})`}
            </li>
          );
        })}
      </ul>
      {props.isExpanded && statVarMatch && (
        <table>
          <thead>
            <tr>
              <th className="sentence-column">Sentence</th>
              <th>Distance</th>
              <th className="stat-var-column">Stat Var</th>
            </tr>
          </thead>
          <tbody>
            {statVarMatch.map((match) => (
              <tr key={match.sentence}>
                <td className="sentence-column">{match.sentence}</td>
                <td>{Number(match.distance).toFixed(3)}</td>
                <td className="stat-var-column">{match.statVar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const fetchData = async (sentence: string, modelName: string) => {
  return axios
    .get(`/api/nl/vector-search`, {
      params: { sentence, modelName },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return resp.data;
    });
};
