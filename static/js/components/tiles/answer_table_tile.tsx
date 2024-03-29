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
 * Component for rendering an answer table tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { URI_PREFIX } from "../../browser/constants";
import {
  ASYNC_ELEMENT_CLASS,
  ASYNC_ELEMENT_HOLDER_CLASS,
} from "../../constants/css_constants";
import { AnswerTableColumn } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
export interface AnswerTableTilePropType {
  // Title to use
  title: string;
  // Dcid of the entity to show the answer for
  entities: string[];
  // Columns in the table
  columns: AnswerTableColumn[];
}

interface AnswerTableData {
  // Map of entity dcid to entity name
  entityNames: Record<string, string>;
  // Map of entity dcid to property expression to list of values
  values: Record<string, Record<string, string[]>>;
  // List of sources that the data came from
  sources: string[];
}

export function AnswerTableTile(props: AnswerTableTilePropType): JSX.Element {
  const [answerData, setAnswerData] = useState<AnswerTableData>(null);

  useEffect(() => {
    fetchData(props).then((data) => {
      setAnswerData(data);
    });
  }, [props]);

  if (!answerData) {
    return null;
  }

  return (
    <div
      className={`chart-container answer-table-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
    >
      <div className={`answer-table-content ${ASYNC_ELEMENT_CLASS}`}>
        <div className="answer-table-title">{props.title}</div>
        <table className="answer-table">
          <thead>
            <tr>
              <th></th>
              {props.columns.map((col, idx) => {
                return <th key={`col-header-${idx}`}>{col.header}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {props.entities.map((entity, rowIdx) => {
              return (
                <tr key={`row-${rowIdx}`}>
                  <td>
                    <a href={URI_PREFIX + entity}>
                      {answerData.entityNames[entity] || entity}
                      <span className="material-icons-outlined">
                        arrow_forward
                      </span>
                    </a>
                  </td>
                  {props.columns.map((col, colIdx) => {
                    return (
                      <td key={`row-${rowIdx}-col-${colIdx}`}>
                        {answerData.values[entity][col.propertyExpr].join(", ")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source">source: {answerData.sources.join(", ")}</div>
    </div>
  );
}

const fetchData = async (
  props: AnswerTableTilePropType
): Promise<AnswerTableData> => {
  const propertyPromises = [];
  // Get the names for the entities
  propertyPromises.push(
    axios.get(`/api/node/propvals`, {
      params: { dcids: [props.entities], propExpr: "->name" },
      paramsSerializer: stringifyFn,
    })
  );
  for (const column of props.columns) {
    propertyPromises.push(
      axios.get(`/api/node/propvals`, {
        params: { dcids: [props.entities], propExpr: column.propertyExpr },
        paramsSerializer: stringifyFn,
      })
    );
  }
  try {
    const resp = await Promise.all(propertyPromises);
    const entityNames = {};
    // The first promise was a promise to get the entity names
    const nameResp = resp[0];
    Object.keys(nameResp.data).forEach((entity) => {
      const val = nameResp.data[entity];
      entityNames[entity] = !_.isEmpty(val)
        ? val[0].name || val[0].value || val[0].dcid
        : entity;
    });
    // The rest of the promises are for column values
    const propResp = resp.slice(1);
    const values = {};
    props.entities.forEach((entity) => {
      values[entity] = {};
    });
    const provIds: Set<string> = new Set();
    propResp.forEach((resp, i) => {
      Object.keys(resp.data).forEach((entity) => {
        const val = resp.data[entity];
        const entityResults = [];
        val.forEach((singleVal) => {
          entityResults.push(
            singleVal.name || singleVal.value || singleVal.dcid
          );
          provIds.add(singleVal.provenanceId);
        });
        values[entity][props.columns[i].propertyExpr] = entityResults;
      });
    });

    // Get hte URLs for the provenances that we got data from
    const provIdList = Array.from(provIds);
    const provIdUrlResp = await axios.get(`/api/node/propvals/out`, {
      params: { dcids: provIdList, prop: "url" },
      paramsSerializer: stringifyFn,
    });
    return {
      entityNames,
      sources: provIdList
        .map((provId) => {
          const urlValues = provIdUrlResp.data[provId];
          if (!_.isEmpty(urlValues)) {
            return new URL(urlValues[0].value).host;
          } else {
            return "";
          }
        })
        .filter((url) => !!url),
      values,
    };
  } catch (e) {
    return null;
  }
};
