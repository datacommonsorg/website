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

import axios from "axios";
import React from "react";

import { mapping, sparql } from "./constants";
import { Binding, Constraint, Translation } from "./translation";

interface PagePropType {
  mapping: string;
  sparql: string;
}

interface PageStateType {
  sql: string;
  bindings: Binding[];
  constraints: Constraint[];
}

export class Page extends React.Component<PagePropType, PageStateType> {
  private sparql: string;
  private mapping: string;
  private delayTimer: NodeJS.Timeout;
  private mappingInputElem: React.RefObject<HTMLTextAreaElement>;
  private sparqlInputElem: React.RefObject<HTMLTextAreaElement>;
  private defaultRadioElem: React.RefObject<HTMLInputElement>;

  constructor(props: PagePropType) {
    super(props);
    this.handleSparqlChange = this.handleSparqlChange.bind(this);
    this.handleMappingChange = this.handleMappingChange.bind(this);
    this.onModeChange = this.onModeChange.bind(this);
    this.sparql = this.props.sparql;
    this.mapping = this.props.mapping;
    this.mappingInputElem = React.createRef();
    this.sparqlInputElem = React.createRef();
    this.defaultRadioElem = React.createRef();

    this.state = {
      sql: "",
      bindings: [],
      constraints: [],
    };
  }

  handleSparqlChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    this.sparql = event.target.value;
    clearTimeout(this.delayTimer);
    this.delayTimer = setTimeout(this.updateTranslation.bind(this), 1000);
  }

  handleMappingChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    this.mapping = event.target.value;
    clearTimeout(this.delayTimer);
    this.delayTimer = setTimeout(this.updateTranslation.bind(this), 1000);
  }

  onModeChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.mappingInputElem.current.value = mapping;
    this.sparqlInputElem.current.value = sparql[event.target.value];
    this.mapping = mapping;
    this.sparql = sparql[event.target.value];
    this.updateTranslation();
  }

  componentDidMount(): void {
    this.updateTranslation();
    this.defaultRadioElem.current.checked = true;
  }

  render(): JSX.Element {
    return (
      <div className="container">
        <h1>Schema Translator</h1>
        <h5>Enter Schema Mapping and Graph Query</h5>
        <form>
          <label id="select-input">
            <input
              type="radio"
              value="observation"
              name="mode"
              onChange={this.onModeChange}
              ref={this.defaultRadioElem}
            />
            Observation
            <br />
            <input
              type="radio"
              value="sv"
              name="mode"
              onChange={this.onModeChange}
            />
            Statistical Variable
          </label>
        </form>
        <div id="input-box" className="row">
          <div className="input-box-content col-6">
            <h6>Schema Mapping</h6>
            <textarea
              ref={this.mappingInputElem}
              id="mapping"
              onChange={this.handleMappingChange}
              defaultValue={this.props.mapping}
            ></textarea>
          </div>
          <div className="input-box-content col-6">
            <h6>Graph Query</h6>
            <textarea
              ref={this.sparqlInputElem}
              id="query"
              onChange={this.handleSparqlChange}
              defaultValue={this.props.sparql}
            ></textarea>
          </div>
        </div>
        <Translation
          sql={this.state.sql}
          bindings={this.state.bindings}
          constraints={this.state.constraints}
        ></Translation>
        <a href={this.createBqUrl()} target="_blank" rel="noreferrer">
          {" "}
          BigQuery Link
        </a>
      </div>
    );
  }

  private createBqUrl(): string {
    const query = encodeURIComponent(this.state.sql);
    // TODO: This link could result in truncations for long queries. Consider
    // putting the query in a modal instead.
    return `https://console.cloud.google.com/bigquery;create-new-query-tab=${query}`;
  }

  private updateTranslation() {
    axios
      .post("/api/translate", {
        sparql: this.sparql,
        mapping: this.mapping,
      })
      .then((resp) => {
        const translation = JSON.parse(resp.data["translation"]);
        for (const binding of translation["Bindings"]) {
          for (const i1 of ["Mapping", "Query"]) {
            for (const i2 of ["Pred", "Sub", "Obj"]) {
              const term = binding[i1][i2];
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

        for (const c of translation["Constraint"]) {
          for (const i1 of ["LHS", "RHS"]) {
            const term = c[i1];
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

        this.setState({
          sql: translation["SQL"],
          bindings: translation["Bindings"],
          constraints: translation["Constraint"],
        });
      });
  }
}
