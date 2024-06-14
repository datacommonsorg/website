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

import React, { useRef, useState } from "react";

const INIT_URL = [
  "https://datacommons.org",
  "https://autopush.datacommons.org",
  "",
];

function splitUrl(url: string) {
  const urlObj = new URL(url);
  const domain = `${urlObj.protocol}//${urlObj.host}`;
  const rest = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  return { domain, rest };
}

export function App(): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const iframeRef1 = useRef<HTMLIFrameElement>(null);
  const iframeRef2 = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string[]>(INIT_URL);
  const [tmpUrl, setTmpUrl] = useState<string[]>(INIT_URL);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      {
        const { domain, rest } = splitUrl(tmpUrl[0]);
        if (rest !== "/") {
          tmpUrl[0] = domain;
          tmpUrl[2] = rest;
        }
      }
      {
        const { domain, rest } = splitUrl(tmpUrl[1]);
        if (rest !== "/") {
          tmpUrl[1] = domain;
          tmpUrl[2] = rest;
        }
      }
      setTmpUrl(tmpUrl);
      setUrl(tmpUrl);
    }
  };

  return (
    <>
      <div className="domain-input">
        <label>
          <div className="label-text">Domain 1</div>
        </label>
        <input
          type="text"
          value={tmpUrl[0]}
          onChange={(e) => {
            setTmpUrl([e.target.value, tmpUrl[1], tmpUrl[2]]);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="domain-input">
        <label>
          <div className="label-text">Domain 2</div>
        </label>
        <input
          type="text"
          value={tmpUrl[1]}
          onChange={(e) => {
            setTmpUrl([tmpUrl[0], e.target.value, tmpUrl[2]]);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <label>
        <div className="label-text">Path (url without domain)</div>
      </label>
      <input
        type="text"
        ref={ref}
        value={tmpUrl[2]}
        placeholder="Enter Path or full URL"
        onChange={(e) => {
          setTmpUrl([tmpUrl[0], tmpUrl[1], e.target.value]);
        }}
        onKeyDown={onKeyDown}
      />
      <div className="iframe-container">
        <iframe
          ref={iframeRef1}
          id="iframe1"
          src={`${url[0]}${url[2]}`}
        ></iframe>
        <iframe
          ref={iframeRef2}
          id="iframe2"
          src={`${url[1]}${url[2]}`}
        ></iframe>
      </div>
    </>
  );
}
