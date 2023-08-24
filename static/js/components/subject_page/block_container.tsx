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

import { Item, ItemList } from "../../apps/explore/item_list";
import { ExploreContext } from "../../shared/context";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { formatString, ReplacementStrings } from "../../utils/tile_utils";
import { getUpdatedHash } from "../../utils/url_utils";

const DELIM = "___";

function camelCaseToWords(camelCaseString: string): string {
  const words = camelCaseString
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space before uppercase letters
    .split(/[\s_-]+/) // Split by spaces, underscores, and hyphens
    .filter((word) => word.length > 0) // Remove empty words
    .map((word) => word.toLowerCase()); // Convert to lowercase

  const capitalizedWords = words.map((word) => {
    const firstLetter = word.charAt(0).toUpperCase();
    const restOfWord = word.slice(1).toLowerCase();
    return firstLetter + restOfWord;
  });

  return capitalizedWords.join(" ");
}

export interface BlockContainerPropType {
  id: string;
  title?: string;
  description: string;
  children?: React.ReactNode;
  footnote?: string;
  place?: NamedTypedPlace;
  commonSVSpec?: StatVarSpec[];
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

  const exploreSVSpec: StatVarSpec[] = [];
  if (exploreData.exploreMore && props.commonSVSpec) {
    for (const spec of props.commonSVSpec) {
      for (const sv in exploreData.exploreMore) {
        if (spec.statVar == sv) {
          exploreSVSpec.push(spec);
        }
      }
    }
    exploreSVSpec.sort((a, b) => {
      return (
        Object.keys(exploreData.exploreMore[b.statVar]).length -
        Object.keys(exploreData.exploreMore[a.statVar]).length
      );
    });
  }

  const buildExploreItems = (
    svExtendedMap: Record<string, string[]>
  ): Item[] => {
    const result: Item[] = [];
    for (const prop in svExtendedMap) {
      const urlSv = svExtendedMap[prop].join(DELIM);
      const url = `/explore/#${getUpdatedHash({
        t: urlSv,
        p: exploreData.place,
        q: "",
        em: "1",
      })}`;
      result.push({
        url,
        text: camelCaseToWords(prop),
      });
    }
    return result;
  };

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
      {exploreSVSpec.length > 0 && (
        <div id="explore-more-section">
          {exploreSVSpec.slice(0, 1).map((spec) => {
            // Only show 1 explore section now.
            return (
              <div key={spec.statVar} className="explore-more-box">
                <span className="explore-more-prompt">
                  Explore {spec.name.toLowerCase()} by: &nbsp;
                </span>
                <ItemList
                  items={buildExploreItems(
                    exploreData.exploreMore[spec.statVar]
                  )}
                ></ItemList>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
