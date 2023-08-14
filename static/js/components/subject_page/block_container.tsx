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

import React, { useContext } from "react";
import ReactMarkdown from "react-markdown";

import { ExploreContext } from "../../shared/context";
import { NamedTypedPlace } from "../../shared/types";
import { formatString, ReplacementStrings } from "../../utils/tile_utils";

const DELIM = "___";

export interface BlockContainerPropType {
  id: string;
  title?: string;
  description: string;
  children?: React.ReactNode;
  footnote?: string;
  place?: NamedTypedPlace;
  commonSVs?: Set<string>;
}

export function BlockContainer(props: BlockContainerPropType): JSX.Element {
  const exploreData = useContext(ExploreContext);

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

  const exploreSV = [];
  if (exploreData.exploreMore && props.commonSVs) {
    for (const sv in exploreData.exploreMore) {
      if (props.commonSVs.has(sv)) {
        exploreSV.push(sv);
      }
    }
  }

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
      {exploreSV.length > 0 && (
        <div id="explore-more-section">
          {exploreSV.map((sv) => {
            return (
              <div key={sv}>
                <span>Explore by </span>
                {Object.keys(exploreData.exploreMore[sv]).map((prop) => {
                  const urlSv = exploreData.exploreMore[sv][prop].join(DELIM);
                  const url = `/explore/#t=${urlSv}&p=${exploreData.place}&pcmp=${exploreData.cmpPlace}&pt=${exploreData.placeType}&dc=${exploreData.dc}&em=1`;
                  return (
                    <a key={url} className="explore-more-link" href={url}>
                      {prop}
                    </a>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
