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

function dotProduct(a: number[], b: number[]): number {
  // We expect same length vector for dot product.
  if (a.length !== b.length) {
    return NaN;
  }
  return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
}

function findKNearestEmbeddings(
  target: number[],
  pool: EmbeddingObject[],
  k: number
): MatchObject[] {
  const result = [];
  for (const emb of pool) {
    const dist = dotProduct(emb.embeddings, target);
    result.push({
      distance: dist,
      sentence: emb.sentence,
      statVar: emb.statVar,
    });
  }
  result.sort((a, b) => a.distance - b.distance);
  return result.slice(0, k);
}

interface StatVar {
  dcid: string;
  rank: number;
  scores: number[];
}

interface IndexScoreBoxProps {
  sentence: string;
  indexName: string;
  modelName: string;
  isExpanded: boolean;
  goldenStatVars: string[];
  overrideStatVars: EmbeddingObject[];
  // Callback function when the eval score of a model with respect to the golden
  // stat vars is computed.
  onScoreUpdated: (modelName: string, sentence: string, score: number) => void;
}

export function IndexScoreBox(props: IndexScoreBoxProps): JSX.Element {
  const [statVarMatch, setStatVarMatch] = useState<MatchObject[]>([]);
  const [rankedStatVars, setRankedStatVars] = useState<StatVar[]>([]);
  const [evalScore, setEvalScore] = useState<number>();

  useEffect(() => {
    (async () => {
      const searchResp = await searchVector(props.sentence, props.indexName);
      const searchResult = searchResp["queryResults"][props.sentence];
      let matches: MatchObject[] = [];
      for (let i = 0; i < searchResult["SV"].length; i++) {
        const sv = searchResult["SV"][i];
        const score = searchResult["SV_to_Sentences"][sv][0]["score"];
        const sentence = searchResult["SV_to_Sentences"][sv][0]["sentence"];
        matches.push({ distance: score, statVar: sv, sentence });
      }
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
        const embeddings = await encodeVector(props.sentence, props.modelName);
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

      const evalScore = accuracy(
        rankedStatVarMatch.map((x) => x.dcid),
        props.goldenStatVars
      );

      setEvalScore(evalScore);
      setStatVarMatch(matches);
      setRankedStatVars(rankedStatVarMatch);
      props.onScoreUpdated(props.modelName, props.sentence, evalScore);
    })();
  }, [props]);

  return (
    <div className="index-score-box">
      <div className="index-name">
        {props.indexName}{" "}
        <span className="eval-score">(accuracy: {evalScore?.toFixed(2)})</span>
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

const searchVector = async (sentence: string, indexName: string) => {
  return axios
    .get(`/api/nl/search-vector`, {
      params: { query: sentence, idx: [indexName] },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return resp.data;
    });
};

const encodeVector = async (sentence: string, modelName: string) => {
  return axios
    .get(`/api/nl/encode-vector`, {
      params: { query: sentence, model: modelName },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return resp.data[0];
    });
};
