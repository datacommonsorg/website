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
import axios from "axios";

interface RankingPropsType {
  dcid: string;
}

interface RankingStateType {
  data: {
    label: string[];
    Population: { name: Record<string, unknown>; label: string }[];
  };
}

class Ranking extends React.Component<RankingPropsType, RankingStateType> {
  constructor(props: RankingPropsType) {
    super(props);
    this.state = {
      data: { label: [], Population: [] },
    };
  }
  render(): JSX.Element {
    const data = this.state.data;
    return (
      <React.Fragment>
        {data.label.length > 0 && (
          <React.Fragment>
            <table id="ranking-table" className="table">
              <thead>
                <tr>
                  <th scope="col">Rankings (in) </th>
                  {data[data.label[0]].map((item, index: number) => {
                    return (
                      <th scope="col" key={index}>
                        {item.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.label.map((item, index) => {
                  return (
                    <tr key={index}>
                      <th scope="row">{item}</th>
                      {data[item].map((rankingInfo, index: number) => {
                        const top = rankingInfo.data.rankFromTop;
                        const bottom = rankingInfo.data.rankFromBottom;
                        let text = "";
                        if (!isNaN(top) && !isNaN(bottom)) {
                          text = `${top} of ${top + bottom}`;
                        }
                        return (
                          <td key={text + index}>
                            <a href={rankingInfo.rankingUrl}>{text}</a>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="source">
              Data from <a href="https://www.census.gov/">census.gov</a>,{" "}
              <a href="https://www.fbi.gov/">fbi.gov</a> and{" "}
              <a href="https://www.bls.gov/">bls.gov</a>
            </div>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  componentDidMount(): void {
    axios.get(`/api/place/ranking/${this.props.dcid}`).then((resp) => {
      this.setState({ data: resp.data });
    });
  }
}

export { Ranking };
