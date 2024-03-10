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
import { BASE_URL, ndcg } from "./util";

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
}

export function SearchResult(props: SearchResultProps) {
  const [statVarMatch, setStatVarMatch] = useState<any>([]);
  const [rankedStatVars, setRankedStatVars] = useState<StatVar[]>([]);

  useEffect(() => {
    (async () => {
      const data = await fetchData(props.sentence, props.modelName);
      const statVarInfo: Record<string, StatVar> = {};
      for (const item of data) {
        if (item["stat_var"] in statVarInfo) {
          statVarInfo[item["stat_var"]].scores.push(item["distance"]);
        } else {
          statVarInfo[item["stat_var"]] = {
            dcid: item["stat_var"],
            rank: Object.keys(statVarInfo).length,
            scores: [item["distance"]],
          };
        }
      }
      const rankedStatVarMatch = Object.values(statVarInfo).sort((a, b) => {
        return a.rank - b.rank;
      });
      setStatVarMatch(data);
      setRankedStatVars(rankedStatVarMatch);
    })();
  }, [props.sentence, props.modelName]);

  // Crop the rankedStatVars to the length of goldenStatVars. Need to evalute
  // this further.
  const evalScore = ndcg(
    rankedStatVars.slice(0, props.goldenStatVars.length).map((x) => x.dcid),
    props.goldenStatVars
  );

  return (
    <div className="search-result">
      <div className="model-name">
        {props.modelName}{" "}
        <span className="ndcg-score">(ndcg: {evalScore.toFixed(2)})</span>
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
              <tr key={match["sentence"]}>
                <td className="sentence-column">{match["sentence"]}</td>
                <td>{Number(match["distance"]).toFixed(3)}</td>
                <td className="stat-var-column">{match["stat_var"]}</td>
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
    .get<any>(`/api/nl/vector-search`, {
      params: { sentence, modelName },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return resp.data;
    });
};
