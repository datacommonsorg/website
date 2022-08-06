/**
 * Copyright 2022 Google LLC
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
 * Component to select a source and dataset.
 */

import axios from "axios";
import React, { useEffect, useState } from "react";
import { Card, Container, CustomInput } from "reactstrap";

import { NamedPlace } from "../../shared/types";

const PREFIX = "dataset-selector";
const MAX_SUGGESTIONS = 5;

interface DatasetSelectorProps {
  // Filter StatVarHierarchy to stat vars that exist for the entities.
  filterStatVars: (entities: NamedPlace[]) => void;
  // Map of source name to dcid.
  sourceMap: Record<string, string>;
}

function simplify(s: string): string {
  return s.replace(/[^0-9a-z]/gi, "").toLowerCase();
}

export function DatasetSelector(props: DatasetSelectorProps): JSX.Element {
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [datasets, setDatasets] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState(
    Object.keys(props.sourceMap)
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsWidth, setSuggestionsWidth] = useState(null);
  const [userInput, setUserInput] = useState("");

  const handleResize = () => {
    const width = document.getElementById(`${PREFIX}-ac`).offsetWidth;
    if (width !== suggestionsWidth) {
      setSuggestionsWidth(width);
    }
  };

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  async function updateDatasets(source: string): Promise<void> {
    if (!(source in props.sourceMap)) {
      return;
    }
    const dcid = props.sourceMap[source];
    const datasetsPromise = await axios.get(
      `/api/browser/propvals/isPartOf/${dcid}`
    );
    const currentDatasets = [];
    for (const dataset of datasetsPromise?.data?.values?.in) {
      currentDatasets.push({
        dcid: dataset.dcid,
        name: dataset.name,
      });
    }
    currentDatasets.sort((a, b): number => {
      return a.name.localeCompare(b.name);
    });
    setDatasets(currentDatasets);
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleResize();
    const input = e.currentTarget.value;
    let newSuggestions = Object.keys(props.sourceMap)
      .map((s) => {
        return {
          name: s,
          rank: simplify(s).indexOf(simplify(input)),
        };
      })
      .sort((a, b): number => {
        return a.rank - b.rank;
      })
      .filter((s) => s.rank > -1)
      .map((s) => s.name);
    if (newSuggestions.length > MAX_SUGGESTIONS) {
      newSuggestions = newSuggestions.slice(0, MAX_SUGGESTIONS);
    }
    setFilteredSuggestions(newSuggestions);
    setUserInput(e.currentTarget.value);
    setShowSuggestions(true);
  };

  const handleOnClick = (e: React.MouseEvent<HTMLLIElement>) => {
    setActiveSuggestion(0);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setUserInput(e.currentTarget.innerText);
    updateDatasets(e.currentTarget.innerText);
    props.filterStatVars([
      {
        dcid: props.sourceMap[e.currentTarget.innerText],
        name: e.currentTarget.innerText,
      },
    ]);
  };

  const handleOnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (filteredSuggestions.length === 0) {
        return;
      }
      setActiveSuggestion(0);
      setShowSuggestions(false);
      if (userInput === "") {
        props.filterStatVars([]);
      } else {
        setUserInput(filteredSuggestions[activeSuggestion]);
        updateDatasets(filteredSuggestions[activeSuggestion]);
        props.filterStatVars([
          {
            dcid: props.sourceMap[filteredSuggestions[activeSuggestion]],
            name: filteredSuggestions[activeSuggestion],
          },
        ]);
      }
    } else if (e.key === "ArrowUp") {
      if (activeSuggestion === 0) {
        return;
      }
      setActiveSuggestion(activeSuggestion - 1);
    } else if (e.key === "ArrowDown") {
      if (activeSuggestion - 1 === filteredSuggestions.length) {
        return;
      }
      setActiveSuggestion(activeSuggestion + 1);
    }
  };

  return (
    <>
      <Card className={`${PREFIX}-card`}>
        <Container fluid={true} className={`${PREFIX}-container`}>
          <div className={`${PREFIX}-main-selector`}>
            <div className={`${PREFIX}-section`}>
              <div className={`${PREFIX}-label`}>Show variables for</div>
              <div className={`${PREFIX}-search`}>
                <div className={`${PREFIX}-source-field`}>
                  <input
                    id={`${PREFIX}-ac`}
                    className={`${PREFIX}-ac`}
                    type="text"
                    placeholder="Enter a source to filter by"
                    onChange={handleOnChange}
                    onKeyDown={handleOnKeyDown}
                    value={userInput}
                  />
                  <i className={`material-icons ${PREFIX}-search-icon`}>
                    search
                  </i>
                </div>
                {showSuggestions && userInput && (
                  <ul
                    className={`${PREFIX}-suggestions`}
                    style={{ width: `${suggestionsWidth || 0}px` }}
                  >
                    {filteredSuggestions.map((s, i) => {
                      let className: string;
                      if (i === activeSuggestion) {
                        className = `${PREFIX}-suggestion-active`;
                      }
                      return (
                        <li
                          className={className}
                          onClick={handleOnClick}
                          key={s}
                        >
                          {s}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className={`${PREFIX}-section`}>
            <CustomInput
              id={`${PREFIX}-custom-input`}
              type="select"
              onChange={(e) => {
                const name = e.currentTarget.value
                  ? e.currentTarget.innerText
                  : userInput;
                const dcid = e.currentTarget.value
                  ? e.currentTarget.value
                  : props.sourceMap[userInput];
                props.filterStatVars([{ name, dcid }]);
              }}
            >
              <option value="">Optionally select a dataset</option>
              {datasets.map((d) => {
                return (
                  <option value={d.dcid} key={d.dcid}>
                    {d.name}
                  </option>
                );
              })}
            </CustomInput>
          </div>
        </Container>
      </Card>
    </>
  );
}
