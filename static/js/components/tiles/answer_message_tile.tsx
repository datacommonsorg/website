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
 * Component for rendering an answer message tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import {
  ASYNC_ELEMENT_CLASS,
  ASYNC_ELEMENT_HOLDER_CLASS,
} from "../../constants/css_constants";
import { DisplayValueSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { CopyButton } from "../form_components/icon_buttons";

export interface AnswerMessageTilePropType {
  // Title to use
  title: string;
  // Dcid of the entity to show the answer for
  entity: string;
  // Relation expression for a property to show as the answer
  propertyExpr?: string;
  // Inline value to show as the answer
  displayValue?: DisplayValueSpec;
}

interface AnswerMessageTileData {
  // Inline value to show as the answer
  displayValue: DisplayValueSpec;
  // Name of the entity to show the answer for
  entityName: string;
}

/**
 * Bold and italicize an entity's name in the title
 * @param title tile title containing entity's name
 * @param entityName name of the entity to highlight
 * @returns JSX element containing stylized element
 */
function highlightEntities(title: string, entityName: string): JSX.Element {
  const entityIndex = title.indexOf(entityName);
  if (entityIndex == -1) {
    return <span>{title}</span>;
  }
  return (
    <span>
      {title.slice(0, entityIndex)}
      <b>
        <i>{entityName}</i>
      </b>
      {title.slice(entityIndex + entityName.length)}
    </span>
  );
}

export function AnswerMessageTile(
  props: AnswerMessageTilePropType
): JSX.Element {
  // Values to display
  const [answerData, setAnswerData] = useState<DisplayValueSpec | undefined>(
    props.displayValue
  );
  // Name of entity the tile is about
  const [entityName, setEntityName] = useState<string>("");

  useEffect(() => {
    fetchData(props).then((data) => {
      setAnswerData(data.displayValue);
      setEntityName(data.entityName);
    });
  }, [props]);

  if (!answerData) {
    return null;
  }

  const answerValues = answerData.values.join(", ");

  return (
    <div
      className={`chart-container answer-message-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
    >
      <div className={`answer-message ${ASYNC_ELEMENT_CLASS}`}>
        {highlightEntities(props.title, entityName)}
        <span>{answerValues}</span>
      </div>
      <div className="source">Source: {answerData.sources.join(", ")}</div>
      <CopyButton textToCopy={answerValues}></CopyButton>
    </div>
  );
}

const fetchData = async (
  props: AnswerMessageTilePropType
): Promise<AnswerMessageTileData> => {
  let entityName = "";
  if (_.isEmpty(props.propertyExpr) && props.displayValue) {
    return Promise.resolve({ displayValue: props.displayValue, entityName });
  }
  try {
    // Get the name of the entity this tile is about
    const nameResp = await axios.get("/api/node/propvals/out", {
      params: { dcids: [props.entity], prop: "name" },
      paramsSerializer: stringifyFn,
    });
    const names = nameResp.data[props.entity] || [];
    entityName = !_.isEmpty(names) ? names[0].value : "";
    // Get property values of the entity
    const propResp = await axios.get(`/api/node/propvals`, {
      params: { dcids: [props.entity], propExpr: props.propertyExpr },
      paramsSerializer: stringifyFn,
    });
    const respValues = propResp.data[props.entity] || [];
    const values: Set<string> = new Set();
    const provIds: Set<string> = new Set();
    respValues.forEach((respVal) => {
      values.add(respVal.name || respVal.value || respVal.dcid);
      provIds.add(respVal.provenanceId);
    });
    // Get URLs of the sources of those values
    const provIdList = Array.from(provIds);
    const provIdUrlResp = await axios.get(`/api/node/propvals/out`, {
      params: { dcids: provIdList, prop: "url" },
      paramsSerializer: stringifyFn,
    });
    const displayValue: DisplayValueSpec = {
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
      values: Array.from(values),
    };
    return { displayValue, entityName };
  } catch (e) {
    return null;
  }
};
