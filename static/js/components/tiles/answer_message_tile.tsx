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
import {
  DisplayValueSpec,
  PropertySpec,
} from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { getPropertyDirection } from "../../utils/subject_page_utils";

export interface AnswerMessageTilePropType {
  // Title to use
  title: string;
  // Dcid of the entity to show the answer for
  entity: string;
  // Property to show as the answer
  property?: PropertySpec;
  // Inline value to show as the answer
  displayValue?: DisplayValueSpec;
}

export function AnswerMessageTile(
  props: AnswerMessageTilePropType
): JSX.Element {
  const [answerData, setAnswerData] = useState<DisplayValueSpec | undefined>(
    props.displayValue
  );

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
      className={`chart-container answer-message-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
    >
      <div className={`answer-message ${ASYNC_ELEMENT_CLASS}`}>
        <span>{props.title}</span>
        <span>{answerData.values.join(", ")}</span>
      </div>
      <div className="source">source: {answerData.sources.join(", ")}</div>
    </div>
  );
}

const fetchData = async (
  props: AnswerMessageTilePropType
): Promise<DisplayValueSpec> => {
  if (props.displayValue || _.isEmpty(props.property)) {
    return Promise.resolve(props.displayValue);
  }
  try {
    const propResp = await axios.get(
      `/api/node/propvals/${getPropertyDirection(props.property)}`,
      {
        params: { dcids: [props.entity], prop: props.property.property },
        paramsSerializer: stringifyFn,
      }
    );
    const respValues = propResp.data[props.entity] || [];
    const values: Set<string> = new Set();
    const provIds: Set<string> = new Set();
    respValues.forEach((respVal) => {
      values.add(respVal.name || respVal.value || respVal.dcid);
      provIds.add(respVal.provenanceId);
    });
    const provIdList = Array.from(provIds);
    const provIdUrlResp = await axios.get(`/api/node/propvals/out`, {
      params: { dcids: provIdList, prop: "url" },
      paramsSerializer: stringifyFn,
    });
    return {
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
  } catch (e) {
    return null;
  }
};
