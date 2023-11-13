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

import React from "react";

export interface Binding {
  Mapping: {
    Obj: string;
    Pred: string;
    Sub: string;
  };
  Query: {
    Obj: string;
    Pred: string;
    Sub: string;
  };
}

export interface Constraint {
  LHS: string;
  RHS: string;
}

interface TranslationPropType {
  sql: string;
  bindings: Binding[];
  constraints: Constraint[];
}

export class Translation extends React.Component<TranslationPropType> {
  formatSql(sql: string): string {
    return sql
      .replace(/ FROM/g, "\n    FROM")
      .replace(/ JOIN/g, "\nJOIN")
      .replace(/ AND/g, "\n    AND")
      .replace(/ WHERE/g, "\nWHERE");
  }
  render(): JSX.Element {
    return (
      <>
        <div id="result">
          <div className="title">Literal Matches</div>
          {this.props.bindings.map((binding, index) => {
            return (
              <table className="literal-match-table" key={index}>
                <tbody>
                  <tr className="query-literal">
                    <td>{binding.Mapping.Pred}</td>
                    <td>{binding.Mapping.Sub}</td>
                    <td>{binding.Mapping.Obj}</td>
                  </tr>
                  <tr>
                    <td className="mapping-literal">{binding.Query.Pred}</td>
                    <td className="mapping-literal">{binding.Query.Sub}</td>
                    <td className="mapping-literal">{binding.Query.Obj}</td>
                  </tr>
                </tbody>
              </table>
            );
          })}
          <div className="title">Binding Sets and Translated SQL</div>
          <table className="translation-info-table">
            <tbody>
              <tr className="header">
                <td className="constraints">Constraints</td>
              </tr>
              <tr>
                <td>
                  <ul>
                    {this.props.constraints.map((c, index) => {
                      return (
                        <li key={index}>
                          &#40;{c.LHS}&#44;&nbsp;{c.RHS}&#41;
                        </li>
                      );
                    })}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
          <table className="translation-info-table">
            <tbody>
              <tr className="header">
                <td className="sql">SQL</td>
              </tr>
              <tr>
                <td className="sql-result">{this.formatSql(this.props.sql)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }
}
