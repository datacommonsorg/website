/**
 * Copyright 2020 Google LLC
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
 * @fileoverview Translator javascript.
 */

const ReactDOM = require("react-dom");
const React = require("react");

import { getApiKey, getApiRoot } from "./util.js";

import { Translation } from "./translator_template.jsx";

/**
 * Update translation results when schema mapping or query changes.
 */
window.onload = function () {
  const inputBox = document.getElementById("input-box");
  const elem = document.getElementById("result");

  let delayTimer;
  // Playground listener
  inputBox.addEventListener(
    "input",
    (event) => {
      clearTimeout(delayTimer);
      delayTimer = setTimeout(function () {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", `${getApiRoot()}/translate?key=${getApiKey()}`);
        const queryEl = document.getElementById("query");
        const mappingEl = document.getElementById("mapping");
        xhr.send(
          JSON.stringify({
            schema_mapping: mappingEl.value,
            sparql: queryEl.value,
          })
        );

        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4) {
            try {
              const response = JSON.parse(xhr.responseText);
              const sql = response["sql"];
              const translation = JSON.parse(response["translation"]);

              for (let binding of translation["Bindings"]) {
                for (const i1 of ["Mapping", "Query"]) {
                  for (const i2 of ["Pred", "Sub", "Obj"]) {
                    let term = binding[i1][i2];
                    if (typeof term == "string") {
                      continue;
                    }
                    if ("ID" in term && "Table" in term) {
                      binding[i1][i2] =
                        "E:" +
                        term["Table"]["Name"].replace(/`/g, "") +
                        term["Table"]["ID"] +
                        "->" +
                        term["ID"];
                    } else if ("Name" in term && "Table" in term) {
                      binding[i1][i2] =
                        "C:" +
                        term["Table"]["Name"].replace(/`/g, "") +
                        term["Table"]["ID"] +
                        "->" +
                        term["Name"];
                    } else if ("Alias" in term) {
                      binding[i1][i2] = term["Alias"];
                    }
                  }
                }
              }

              for (let c of translation["Constraint"]) {
                for (const i1 of ["LHS", "RHS"]) {
                  let term = c[i1];
                  if (typeof term == "string") {
                    continue;
                  }
                  if ("Name" in term && "Table" in term) {
                    c[i1] =
                      "C:" +
                      term["Table"]["Name"].replace(/`/g, "") +
                      term["Table"]["ID"] +
                      "->" +
                      term["Name"];
                  } else if ("Alias" in term) {
                    c[i1] = term["Alias"];
                  }
                }
              }
              ReactDOM.render(
                <Translation
                  sql={sql.replace(/`/g, "")}
                  bindings={translation["Bindings"]}
                  constraints={translation["Constraint"]}
                />,
                elem
              );
            } catch (err) {
              console.log(err);
              ReactDOM.render(
                <Translation sql="" bindings={[]} constraints={[]} />,
                elem
              );
            }
          }
        };
      }, 1000);
    },
    false
  );

  inputBox.dispatchEvent(new Event("input", {}));
};
