/**
 * Copyright 2023 Google LLC
 *
 * Licensed under he Apache License, Version 2.0 (the "License");
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

// diff ratio smaller than this is regarded as no diff.
const DIFF_RATIO_THRESHOLD = 0.001;

export function App(props: {
  data: Record<string, { blob1: string; blob2: string }>;
}): JSX.Element {
  return (
    <>
      {Object.keys(props.data).map((name, idx) => {
        return (
          <div key={idx}>
            <div className="name">
              Url Path: <b>{"/" + name}</b>
            </div>
            <Item
              blob1={props.data[name].blob1}
              blob2={props.data[name].blob2}
            ></Item>
          </div>
        );
      })}
    </>
  );
}

interface ItemData {
  diff: string;
  base: string;
  diffRatio: number;
}

function Item(props: { blob1: string; blob2: string }): JSX.Element {
  const [data, setData] = useState<ItemData>(null);

  useEffect(() => {
    axios
      .get("/screenshot/api/diff", {
        params: {
          blob1: props.blob1,
          blob2: props.blob2,
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        setData(resp.data);
      });
  }, [props.blob1, props.blob2]);

  return (
    <div>
      {data == null && <span className="loading">LOADING...</span>}
      {data != null && (
        <div>
          <div>
            diff ratio: <b>{data.diffRatio}</b>
          </div>
          {data.diffRatio > DIFF_RATIO_THRESHOLD && (
            <div className="row">
              <div className="col-md-6">
                <div>Base</div>
                <img
                  className="screenshot-image col-md-12"
                  src={`data:image/png;base64,${data.base}`}
                />
              </div>
              <div className="col-md-6">
                <div>Current - Base</div>
                <img
                  className="screenshot-image col-md-12"
                  src={`data:image/png;base64,${data.diff}`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
