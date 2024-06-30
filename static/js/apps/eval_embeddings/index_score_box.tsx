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

import { loadSpinner, removeSpinner } from "../../shared/util";
import { BASE_URL, EmbeddingObject, MatchObject, Override } from "./util";

function dotProduct(a: number[], b: number[]): number {
  // We expect same length vector for dot product.
  if (a.length !== b.length) {
    return NaN;
  }
  return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
}

function findNearestEmbeddings(
  target: number[],
  pool: EmbeddingObject[],
  threshold: number
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
  return result.filter((x) => x.distance > threshold);
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
  modelScoreThreshold: number;
  overrideStatVars: EmbeddingObject[];
}

export function IndexScoreBox(props: IndexScoreBoxProps): JSX.Element {
  const [statVarMatch, setStatVarMatch] = useState<MatchObject[]>([]);

  const elemId = `index-score-box-${props.indexName}-${props.modelName}`;

  useEffect(() => {
    loadSpinner(elemId);
    (async () => {
      if (!props.sentence) {
        removeSpinner(elemId);
        return;
      }
      const searchResp = await searchVector(props.sentence, props.indexName);
      const searchResult = searchResp["queryResults"][props.sentence];
      let matches: MatchObject[] = [];
      for (let i = 0; i < searchResult["SV"].length; i++) {
        const sv = searchResult["SV"][i];
        const score = searchResult["SV_to_Sentences"][sv][0]["score"];
        const sentence = searchResult["SV_to_Sentences"][sv][0]["sentence"];
        matches.push({
          distance: score,
          sentence,
          statVar: sv,
          override: Override.NONE,
        });
      }
      // Use override stat var embeddings
      if (props.overrideStatVars) {
        const overrideSV = new Set(
          props.overrideStatVars.map((x) => x.statVar)
        );
        for (const match of matches) {
          if (overrideSV.has(match.statVar)) {
            match.override = Override.OLD;
          }
        }
        const embeddings = await encodeVector(props.sentence, props.modelName);
        const overrideMatches = findNearestEmbeddings(
          embeddings,
          props.overrideStatVars,
          props.modelScoreThreshold
        );
        overrideMatches.forEach((x) => (x.override = Override.NEW));
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
      setStatVarMatch(matches);
      removeSpinner(elemId);
    })();
  }, [props, elemId]);

  return (
    <div className="index-score-box" id={elemId}>
      <div className="index-name">{props.indexName}</div>
      <table>
        <thead>
          <tr>
            <th className="stat-var-column">stat var / topic</th>
            <th>cosine score</th>
            <th className="sentence-column">Sentence</th>
          </tr>
        </thead>
        <tbody>
          {statVarMatch.map((match, i) => (
            <tr key={match.sentence + i} className={match.override}>
              <td className="stat-var-column">
                {" "}
                <a
                  href={`${BASE_URL}/${match.statVar}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {match.statVar}
                </a>
              </td>
              <td>{Number(match.distance).toFixed(3)}</td>
              <td className="sentence-column">{match.sentence}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );
}

const searchVector = async (sentence: string, indexName: string) => {
  return axios
    .post(`/api/nl/search-vector?idx=${indexName}`, {
      queries: [sentence],
    })
    .then((resp) => {
      return resp.data;
    });
};

const encodeVector = async (sentence: string, modelName: string) => {
  return axios
    .post(`/api/nl/encode-vector?model=${modelName}`, {
      queries: [sentence],
    })
    .then((resp) => {
      return resp.data[sentence];
    });
};
