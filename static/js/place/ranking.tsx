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
import { FormattedMessage } from "react-intl";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { intl, LocalizedLink } from "../i18n/i18n";

interface RankingPropsType {
  dcid: string;
  locale: string;
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
    const provenanceLinks = (
      <>
        <a href="https://www.census.gov/">census.gov</a>,{" "}
        <a href="https://www.fbi.gov/">fbi.gov</a>,{" "}
        <a href="https://www.bls.gov/">bls.gov</a>
      </>
    );
    return (
      <React.Fragment>
        {data.label.length > 0 && (
          <React.Fragment>
            <table
              id="ranking-table"
              className={`table ${ASYNC_ELEMENT_CLASS}`}
            >
              <thead>
                <tr>
                  <th scope="col">
                    <FormattedMessage
                      id="place_page_ranking_table-ranking_in"
                      defaultMessage="Rankings (in) "
                      description="The name of the rankings column of the ranking table in the Place Page."
                    />
                  </th>
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
                          text = intl.formatMessage(
                            {
                              id: "place_page_ranking_table-ranking_value",
                              defaultMessage: "{rank} of {total}",
                              description:
                                'The main content of the ranking table, telling users how the current place ranks among other places of the same type in the same parent place. For ZIP Code 94539, we see that for Largest Population, it is "{8} of {41}" among ZIP Codes in Alameda County.',
                            },
                            {
                              rank: top,
                              total: top + bottom,
                            }
                          );
                        }
                        return (
                          <td key={text + index}>
                            <LocalizedLink
                              href={rankingInfo.rankingUrl}
                              text={text}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="source">
              <FormattedMessage
                id="chart_metadata-provenance"
                defaultMessage="Data from {sources}"
                description="Used to cite where our data is from, but that it was provided through Data Commons. e.g., 'Data from {nytimes.com} via Data Commons' or 'Data from {census.gov, nytimes.com}'"
                values={{ sources: provenanceLinks }}
              />
            </div>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  componentDidMount(): void {
    axios
      .get(`/api/place/ranking/${this.props.dcid}?hl=${this.props.locale}`)
      .then((resp) => {
        this.setState({ data: resp.data });
      });
  }
}

export { Ranking };
