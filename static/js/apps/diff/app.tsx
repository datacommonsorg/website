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

import React, { useEffect, useRef, useState } from "react";

interface AppUrl {
  domain1: string;
  domain2: string;
  path: string;
}

const INIT_URL: AppUrl = {
  domain1: "https://datacommons.org",
  domain2: "https://autopush.datacommons.org",
  path: "",
};

function splitUrl(url: string) {
  const urlObj = new URL(url);
  const domain = `${urlObj.protocol}//${urlObj.host}`;
  const path = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  return { domain, path };
}

export function App(): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const iframeRef1 = useRef<HTMLIFrameElement>(null);
  const iframeRef2 = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<AppUrl>(INIT_URL);
  const [inputUrl, setInputUrl] = useState<AppUrl>(INIT_URL);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "URLResponse") {
        console.log(url);
        const iframeURL = event.data.url;
        const { domain, path } = splitUrl(iframeURL);
        console.log(domain, path);
        setUrl({ ...url, path });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [url]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      {
        const { domain, path } = splitUrl(inputUrl.domain1);
        if (path !== "/") {
          inputUrl.domain1 = domain;
          inputUrl.path = path;
        }
      }
      {
        const { domain, path } = splitUrl(inputUrl.domain2);
        if (path !== "/") {
          inputUrl.domain2 = domain;
          inputUrl.path = path;
        }
      }
      setInputUrl(inputUrl);
      setUrl(inputUrl);
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
          value={inputUrl.domain1}
          onChange={(e) => {
            setInputUrl({
              domain1: e.target.value,
              domain2: inputUrl.domain2,
              path: inputUrl.path,
            });
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
          value={inputUrl.domain2}
          onChange={(e) => {
            setInputUrl({
              domain1: inputUrl.domain1,
              domain2: e.target.value,
              path: inputUrl.path,
            });
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
        value={inputUrl.path}
        placeholder="Enter path starting with /"
        onChange={(e) => {
          setInputUrl({
            domain1: inputUrl.domain1,
            domain2: inputUrl.domain2,
            path: e.target.value,
          });
        }}
        onKeyDown={onKeyDown}
      />
      <div className="iframe-container">
        <iframe
          ref={iframeRef1}
          id="iframe1"
          src={`${url.domain1}${url.path}`}
          onLoad={() => {
            iframeRef1.current.contentWindow.postMessage(
              "Request URL",
              url.domain1
            );
          }}
        ></iframe>
        <iframe
          ref={iframeRef2}
          id="iframe2"
          src={`${url.domain2}${url.path}`}
          onLoad={() => {
            iframeRef2.current.contentWindow.postMessage(
              "Request URL",
              url.domain2
            );
          }}
        ></iframe>
      </div>
    </>
  );
}
