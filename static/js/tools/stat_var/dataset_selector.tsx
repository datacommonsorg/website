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

<<<<<<< HEAD
const CSS_PREFIX = "dataset-selector";
=======
const PREFIX = "dataset-selector";
>>>>>>> f29afa20 (dataset selector)
const MAX_SUGGESTIONS = 5;

interface DatasetSelectorProps {
  // Filter StatVarHierarchy to stat vars that exist for the entities.
  filterStatVars: (entities: NamedPlace[]) => void;
  // Map of source name to dcid.
<<<<<<< HEAD
  sourceMap: Record<string, string>;
}

/**
 * Remove non-alphanumeric characters and convert to lowercase.
 * @param s Input string
 */
function simplify(s: string): string {
  return s.replace(/[^0-9a-z]/gi, "").toLowerCase();
=======
  sources: Record<string, string>;
>>>>>>> f29afa20 (dataset selector)
}

export function DatasetSelector(props: DatasetSelectorProps): JSX.Element {
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [datasets, setDatasets] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState(
<<<<<<< HEAD
    Object.keys(props.sourceMap)
=======
    Object.keys(props.sources)
>>>>>>> f29afa20 (dataset selector)
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsWidth, setSuggestionsWidth] = useState(null);
  const [userInput, setUserInput] = useState("");

  const handleResize = () => {
<<<<<<< HEAD
    const width = document.getElementById(`${CSS_PREFIX}-ac`).offsetWidth;
=======
    const width = document.getElementById(`${PREFIX}-ac`).offsetWidth;
>>>>>>> f29afa20 (dataset selector)
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

<<<<<<< HEAD
  function updateDatasets(source: string): void {
    if (!(source in props.sourceMap)) {
      return;
    }
    const dcid = props.sourceMap[source];
    axios
      .get(`/api/browser/propvals/isPartOf/${dcid}`)
      .then((resp) => {
        const currentDatasets = [];
        for (const dataset of resp.data?.values?.in) {
          currentDatasets.push({
            dcid: dataset.dcid,
            name: dataset.name,
          });
        }
        currentDatasets.sort((a, b): number => {
          return a.name.localeCompare(b.name);
        });
        setDatasets(currentDatasets);
      })
      .catch(() => {
        setDatasets([]);
      });
=======
  async function updateDatasets(source: string) {
    if (!(source in props.sources)) return;
    const dcid = props.sources[source];
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
>>>>>>> f29afa20 (dataset selector)
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleResize();
    const input = e.currentTarget.value;
<<<<<<< HEAD
    const newSuggestions = Object.keys(props.sourceMap)
=======
    let newSuggestions = Object.keys(props.sources)
>>>>>>> f29afa20 (dataset selector)
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
<<<<<<< HEAD
      .map((s) => s.name)
      .slice(0, MAX_SUGGESTIONS);
=======
      .map((s) => s.name);
    if (newSuggestions.length > MAX_SUGGESTIONS) {
      newSuggestions = newSuggestions.slice(0, MAX_SUGGESTIONS);
    }
>>>>>>> f29afa20 (dataset selector)
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
<<<<<<< HEAD
        dcid: props.sourceMap[e.currentTarget.innerText],
        name: e.currentTarget.innerText,
=======
        name: e.currentTarget.innerText,
        dcid: props.sources[e.currentTarget.innerText],
>>>>>>> f29afa20 (dataset selector)
      },
    ]);
  };

  const handleOnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
<<<<<<< HEAD
      if (filteredSuggestions.length === 0) {
        return;
      }
      setActiveSuggestion(0);
      setShowSuggestions(false);
      if (userInput === "") {
        setDatasets([]);
=======
      if (filteredSuggestions.length === 0) return;
      setActiveSuggestion(0);
      setShowSuggestions(false);
      if (userInput === "") {
>>>>>>> f29afa20 (dataset selector)
        props.filterStatVars([]);
      } else {
        setUserInput(filteredSuggestions[activeSuggestion]);
        updateDatasets(filteredSuggestions[activeSuggestion]);
        props.filterStatVars([
          {
<<<<<<< HEAD
            dcid: props.sourceMap[filteredSuggestions[activeSuggestion]],
            name: filteredSuggestions[activeSuggestion],
=======
            name: filteredSuggestions[activeSuggestion],
            dcid: props.sources[filteredSuggestions[activeSuggestion]],
>>>>>>> f29afa20 (dataset selector)
          },
        ]);
      }
    } else if (e.key === "ArrowUp") {
<<<<<<< HEAD
      if (activeSuggestion === 0) {
        return;
      }
      setActiveSuggestion(activeSuggestion - 1);
    } else if (e.key === "ArrowDown") {
      if (activeSuggestion - 1 === filteredSuggestions.length) {
        return;
      }
=======
      if (activeSuggestion === 0) return;
      setActiveSuggestion(activeSuggestion - 1);
    } else if (e.key === "ArrowDown") {
      if (activeSuggestion - 1 === filteredSuggestions.length) return;
>>>>>>> f29afa20 (dataset selector)
      setActiveSuggestion(activeSuggestion + 1);
    }
  };

  return (
    <>
<<<<<<< HEAD
      <Card className={`${CSS_PREFIX}-card`}>
        <Container fluid={true} className={`${CSS_PREFIX}-container`}>
          <div className={`${CSS_PREFIX}-main-selector`}>
            <div className={`${CSS_PREFIX}-section`}>
              <div className={`${CSS_PREFIX}-label`}>Show variables for</div>
              <div className={`${CSS_PREFIX}-search`}>
                <div className={`${CSS_PREFIX}-source-field`}>
                  <input
                    id={`${CSS_PREFIX}-ac`}
                    className={`${CSS_PREFIX}-ac`}
=======
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
>>>>>>> f29afa20 (dataset selector)
                    type="text"
                    placeholder="Enter a source to filter by"
                    onChange={handleOnChange}
                    onKeyDown={handleOnKeyDown}
                    value={userInput}
                  />
<<<<<<< HEAD
                  <i className={`material-icons ${CSS_PREFIX}-search-icon`}>
=======
                  <i className={`material-icons ${PREFIX}-search-icon`}>
>>>>>>> f29afa20 (dataset selector)
                    search
                  </i>
                </div>
                {showSuggestions && userInput && (
                  <ul
<<<<<<< HEAD
                    className={`${CSS_PREFIX}-suggestions`}
=======
                    className={`${PREFIX}-suggestions`}
>>>>>>> f29afa20 (dataset selector)
                    style={{ width: `${suggestionsWidth || 0}px` }}
                  >
                    {filteredSuggestions.map((s, i) => {
                      let className: string;
                      if (i === activeSuggestion) {
<<<<<<< HEAD
                        className = `${CSS_PREFIX}-suggestion-active`;
=======
                        className = `${PREFIX}-suggestion-active`;
>>>>>>> f29afa20 (dataset selector)
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
<<<<<<< HEAD
          <div className={`${CSS_PREFIX}-section`}>
            <CustomInput
              id={`${CSS_PREFIX}-custom-input`}
=======
          <div className={`${PREFIX}-section`}>
            <CustomInput
              id={`${PREFIX}-custom-input`}
>>>>>>> f29afa20 (dataset selector)
              type="select"
              onChange={(e) => {
                const name = e.currentTarget.value
                  ? e.currentTarget.innerText
                  : userInput;
                const dcid = e.currentTarget.value
                  ? e.currentTarget.value
<<<<<<< HEAD
                  : props.sourceMap[userInput];
=======
                  : props.sources[userInput];
>>>>>>> f29afa20 (dataset selector)
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
<<<<<<< HEAD
=======

function simplify(s: string): string {
  return s.replace(/[^0-9a-z]/gi, "").toLowerCase();
}
>>>>>>> f29afa20 (dataset selector)
