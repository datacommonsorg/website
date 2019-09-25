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

import React, { Component } from "react";

class Translation extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div>
        <div className="title">Literal Matches</div>
        {this.props.bindings.map((binding, index) => {
          return (
            <table className="literal-match-table" key={index}>
              <tbody>
                <tr className="query-literal">
                  <td>{binding["Mapping"]["Pred"]}</td>
                  <td>{binding["Mapping"]["Sub"]}</td>
                  <td>{binding["Mapping"]["Obj"]}</td>
                </tr>
                <tr>
                  <td className="mapping-literal">{binding["Query"]["Pred"]}</td>
                  <td className="mapping-literal">{binding["Query"]["Sub"]}</td>
                  <td className="mapping-literal">{binding["Query"]["Obj"]}</td>
                </tr>
              </tbody>
            </table>
          );
        })}
        <div className="title">Binding Sets and Translated SQL</div>
        <div className="summary-title">Summary</div>

        <table className="translation-info-table">
          <tbody>
            <tr className="header">
              <td className="sql">SQL</td>
              <td className="constraints">Constraints</td>
            </tr>
            <tr>
              <td className="sql-result">{this.props.sql}</td>
              <td>
                <ul>
                  {this.props.constraints.map((c, index) =>{
                    return (
                      <li key={index}>
                        &#40;{c["LHS"]}&#44;&nbsp;{c["RHS"]}&#41;
                      </li>
                    )
                  })}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export {
  Translation,
}