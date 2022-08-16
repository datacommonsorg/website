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
import React, { useEffect, useRef, useState } from "react";
import { Card, Container, CustomInput } from "reactstrap";

import { DATASET_PARAM, getUrlToken, SOURCE_PARAM, updateHash } from "./util";

const CSS_PREFIX = "dataset-selector";
const MAX_SUGGESTIONS = 5;

interface DatasetSelectorProps {
  // Map of source name to dcid.
  sourceMap: Record<string, string>;
}

/**
 * Removes non-alphanumeric characters and convert to lowercase.
 * @param s Input string
 * @returns Formatted string
 */
function simplify(s: string): string {
  return s.replace(/[^0-9a-z]/gi, "").toLowerCase();
}

export function DatasetSelector(props: DatasetSelectorProps): JSX.Element {
  const searchRef = useRef(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [datasets, setDatasets] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState(
    Object.keys(props.sourceMap)
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userInput, setUserInput] = useState("");

  function updateSource(source: string): void {
    if (!source) {
      setUserInput("");
      return;
    }
    axios
      .get(`/api/stats/propvals/name/${source}`)
      .then((resp) => {
        setUserInput(
          resp.data[source].length > 0 ? resp.data[source][0] : source
        );
      })
      .catch(() => {
        setUserInput("");
      });
  }

  function updateDatasets(source: string): void {
    if (!source) {
      setDatasets([]);
      return;
    }
    axios
      .get(`/api/browser/propvals/isPartOf/${source}`)
      .then((resp) => {
        const currentDatasets = [];
        const datasetSet = new Set();
        for (const dataset of resp.data?.values?.in) {
          // Remove duplicates.
          if (datasetSet.has(dataset.dcid)) {
            continue;
          }
          currentDatasets.push({
            dcid: dataset.dcid,
            name: dataset.name,
          });
          datasetSet.add(dataset.dcid);
        }
        currentDatasets.sort((a, b): number => {
          return a.name.localeCompare(b.name);
        });
        setDatasets(currentDatasets);
        const dataset = getUrlToken(DATASET_PARAM);
        if (!dataset || !currentDatasets.some((d) => d.dcid === dataset)) {
          return;
        }
        const datasetOption = document.getElementById(
          `${CSS_PREFIX}-${dataset}`
        );
        datasetOption.setAttribute("selected", "true");
      })
      .catch(() => {
        setDatasets([]);
      });
  }

  useEffect(() => {
    const handleHashChange = () => {
      const source = getUrlToken(SOURCE_PARAM);
      updateSource(source);
      updateDatasets(source);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent): void {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget.value;
    const newSuggestions = Object.keys(props.sourceMap)
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
      .map((s) => s.name)
      .slice(0, MAX_SUGGESTIONS);
    setFilteredSuggestions(newSuggestions);
    if (activeSuggestion >= newSuggestions.length) {
      setActiveSuggestion(newSuggestions.length - 1);
    }
    setUserInput(e.currentTarget.value);
    setShowSuggestions(true);
  };

  const handleOnClick = (e: React.MouseEvent<HTMLLIElement>) => {
    const name = e.currentTarget.innerText;
    const dcid = name in props.sourceMap ? props.sourceMap[name] : "";
    setActiveSuggestion(0);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setUserInput(name);
    updateDatasets(dcid);
    updateHash({ [SOURCE_PARAM]: dcid, [DATASET_PARAM]: "" });
  };

  const handleOnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (filteredSuggestions.length === 0) {
        return;
      }
      setActiveSuggestion(0);
      setShowSuggestions(false);
      if (userInput === "") {
        setDatasets([]);
        updateHash({ [SOURCE_PARAM]: "", [DATASET_PARAM]: "" });
      } else {
        const name = filteredSuggestions[activeSuggestion];
        const dcid = name in props.sourceMap ? props.sourceMap[name] : "";
        setUserInput(name);
        updateDatasets(dcid);
        updateHash({ [SOURCE_PARAM]: dcid, [DATASET_PARAM]: "" });
      }
    } else if (e.key === "ArrowUp") {
      if (activeSuggestion === 0) {
        return;
      }
      setActiveSuggestion(activeSuggestion - 1);
    } else if (e.key === "ArrowDown") {
      if (activeSuggestion + 1 === filteredSuggestions.length) {
        return;
      }
      setActiveSuggestion(activeSuggestion + 1);
    }
  };

  return (
    <>
      <Card className={`${CSS_PREFIX}-card`}>
        <Container fluid={true} className={`${CSS_PREFIX}-container`}>
          <div className={`${CSS_PREFIX}-main-selector`}>
            <div className={`${CSS_PREFIX}-section`}>
              <div className={`${CSS_PREFIX}-label`}>Show variables for</div>
              <div className={`${CSS_PREFIX}-search`} ref={searchRef}>
                <div className={`${CSS_PREFIX}-source-field`}>
                  <input
                    id={`${CSS_PREFIX}-ac`}
                    className={`${CSS_PREFIX}-ac`}
                    type="text"
                    placeholder="Enter a source to filter by"
                    onChange={handleOnChange}
                    onFocus={() => {
                      setShowSuggestions(true);
                    }}
                    onKeyDown={handleOnKeyDown}
                    value={userInput}
                  />
                  <i className={`material-icons ${CSS_PREFIX}-search-icon`}>
                    search
                  </i>
                </div>
                {showSuggestions && userInput && (
                  <ul className={`${CSS_PREFIX}-suggestions`}>
                    {filteredSuggestions.map((s, i) => {
                      let className: string;
                      if (i === activeSuggestion) {
                        className = `${CSS_PREFIX}-suggestion-active`;
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
          <div className={`${CSS_PREFIX}-section`}>
            <CustomInput
              id={`${CSS_PREFIX}-custom-input`}
              type="select"
              onChange={(e) => {
                const dcid = e.currentTarget.value ? e.currentTarget.value : "";
                updateHash({ [DATASET_PARAM]: dcid });
              }}
            >
              <option value="">Select a dataset (optional)</option>
              {datasets.map((d) => {
                return (
                  <option
                    value={d.dcid}
                    key={d.dcid}
                    id={`${CSS_PREFIX}-${d.dcid}`}
                  >
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
