/**
 * Copyright 2023 Google LLC
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
 * A container for blocks of all types.
 */

import React from "react";
import ReactMarkdown from "react-markdown";

import { NamedTypedPlace } from "../../shared/types";
import { formatString, ReplacementStrings } from "../../utils/tile_utils";

export interface BlockContainerPropType {
  id: string;
  title?: string;
  description: string;
  children?: React.ReactNode;
  footnote?: string;
  place?: NamedTypedPlace;
}

export function BlockContainer(props: BlockContainerPropType): JSX.Element {
  let footnote: string;
  if (props.footnote) {
    footnote = props.footnote
      .split("\n\n")
      .map((f, i) => {
        f = f.trim();
        return f ? `${i + 1}. ${f}` : "";
      })
      .join("\n");
  }
  const rs: ReplacementStrings = {
    placeName: props.place ? props.place.name : "",
    placeDcid: props.place ? props.place.dcid : "",
  };
  const title = props.title ? formatString(props.title, rs) : "";
  const description = props.description
    ? formatString(props.description, rs)
    : "";

  return (
    <section
      className={`block subtopic ${title ? "" : "notitle"}`}
      id={props.id}
    >
      {title && <h3>{title}</h3>}
      {description && <p className="block-desc">{description}</p>}
      {props.children}
      {footnote && (
        <footer className="block-footer">
          <ReactMarkdown>{footnote}</ReactMarkdown>
        </footer>
      )}
    </section>
  );
}
