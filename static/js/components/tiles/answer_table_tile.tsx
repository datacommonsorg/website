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
import { DownloadButton } from "../form_components/icon_buttons";

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
  // Map of entity dcid to property expression to list of source URLs that the data came from
  sources: Record<string, Record<string, string[]>>;
  // Map of entity dcid to property expression to list of values
  values: Record<string, Record<string, string[]>>;
}

export function AnswerTableTile(props: AnswerTableTilePropType): JSX.Element {
  const [answerData, setAnswerData] = useState<AnswerTableData>(null);
  const [answerAsCsv, setAnswerAsCsv] = useState<string>("");

  useEffect(() => {
    fetchData(props).then((data) => {
      setAnswerData(data);
      setAnswerAsCsv(generateCsv(data, props));
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
        {props.title && <div className="answer-table-title">{props.title}</div>}
        <DownloadButton
          content={answerAsCsv}
          filename={`${props.title || "results"}.csv`}
        ></DownloadButton>
        <div className="table-container">
          <table className="table">
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
                        <span className="material-icons-outlined arrow-icon">
                          arrow_forward
                        </span>
                      </a>
                    </td>
                    {props.columns.map((col, colIdx) => {
                      return (
                        <td key={`row-${rowIdx}-col-${colIdx}`}>
                          {answerData.values[entity][col.propertyExpr].map(
                            (value, valIdx) => {
                              return (
                                <span key={`value-${valIdx}`}>
                                  {value}
                                  <br />
                                </span>
                              );
                            }
                          )}
                          {!_.isEmpty(
                            answerData.sources[entity][col.propertyExpr]
                          ) && (
                            <div className="source">
                              Source:{" "}
                              {answerData.sources[entity][
                                col.propertyExpr
                              ].join(", ")}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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
    // map entity -> propExpr -> list of values
    const values: Record<string, Record<string, string[]>> = {};
    // map entity -> propExpr -> list of provenanceIds
    const provIds: Record<string, Record<string, string[]>> = {};
    // store unique provenanceIds for subsequent API fetch for their URLs
    const uniqueProvIds = new Set<string>();

    props.entities.forEach((entity) => {
      values[entity] = {};
      provIds[entity] = {};
    });
    propResp.forEach((resp, i) => {
      Object.keys(resp.data).forEach((entity) => {
        const val = resp.data[entity];

        // Get all values of the current property for the current entity
        const entityResults = new Set<string>();
        val.forEach((singleVal) => {
          entityResults.add(
            singleVal.name || singleVal.value || singleVal.dcid
          );
        });
        values[entity][props.columns[i].propertyExpr] =
          Array.from(entityResults);

        // Get all sources associated with the values
        const valProvId = val.map((singleVal) => {
          return singleVal.provenanceId;
        });
        valProvId.forEach((provId) => uniqueProvIds.add(provId));
        provIds[entity][props.columns[i].propertyExpr] = valProvId;
      });
    });

    // Get the URLs for the provenances that we got data from
    const provIdList = Array.from(uniqueProvIds);
    const provIdUrlResp = await axios.get(`/api/node/propvals/out`, {
      params: { dcids: provIdList, prop: "url" },
      paramsSerializer: stringifyFn,
    });
    const provIdToUrl = {};
    provIdList.forEach((provId) => {
      const urlValues = provIdUrlResp.data[provId];
      if (!_.isEmpty(urlValues)) {
        provIdToUrl[provId] = new URL(urlValues[0].value).host;
      } else {
        provIdToUrl[provId] = "";
      }
    });

    // Create mapping of entity -> propExpr -> list of source URLs
    const sources: Record<string, Record<string, string[]>> = {};
    for (const entity in provIds) {
      sources[entity] = {};
      for (const propertyExpr in provIds[entity]) {
        const sourceUrls = new Set<string>();
        provIds[entity][propertyExpr].forEach((provId) => {
          sourceUrls.add(provIdToUrl[provId]);
        });
        sources[entity][propertyExpr] = Array.from(sourceUrls).filter(
          (url) => !!url
        );
      }
    }
    return {
      entityNames,
      sources,
      values,
    };
  } catch (e) {
    return null;
  }
};

/** Convert table data to a CSV for downloading */
function generateCsv(
  data: AnswerTableData,
  props: AnswerTableTilePropType
): string {
  if (!data) {
    return "";
  }

  // Helper function to encase each csv cell in quotes and escape double quotes
  const sanitize = (cell: string): string => {
    return `"${cell.replaceAll('"', '""')}"`;
  };

  const headerRow = `"DCID","Name",${props.columns
    .map((column) => {
      const valueHeader = sanitize(column.header);
      const sourceHeader = sanitize(`${column.header} source`);
      return `${valueHeader},${sourceHeader}`;
    })
    .join(",")}`;

  const dataRows = new Array<string>();
  props.entities.forEach((entity) => {
    const row = new Array<string>();
    // first column is entity DCID
    row.push(sanitize(entity));
    // second column is entity name
    row.push(sanitize(data.entityNames[entity]));
    // rest of columns are value and value's source url
    props.columns.forEach((column) => {
      const value = data.values[entity][column.propertyExpr].join("; ");
      const source = data.sources[entity][column.propertyExpr].join("; ");
      row.push(sanitize(value));
      row.push(sanitize(source));
    });
    dataRows.push(row.join(","));
  });

  return `${headerRow}\n${dataRows.join("\n")}`;
}
