/**
 * Copyright 2021 Google LLC
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

import { LineTile } from "./line_tile";
import { StatVarMetadata } from "./types";

interface MainPanePropType {
  /**
   * The place dcid.
   */
  dcid: string;
  /**
   * The place name.
   */
  placeName: string;
  /**
   * The place type.
   */
  placeType: string;
  /**
   * The topic of the current page.
   */
  topic: string;
}

class MainPane extends React.Component<MainPanePropType> {
  constructor(props: MainPanePropType) {
    super(props);
  }
  render(): JSX.Element {
    const lineId = "line-1";
    const lineTitle = "line-title";
    const statVarMetadata: StatVarMetadata = {
      statVars: [
        "Count_Person_BelowPovertyLevelInThePast12Months_AmericanIndianOrAlaskaNativeAlone",
        "Count_Person_BelowPovertyLevelInThePast12Months_AsianAlone",
        "Count_Person_BelowPovertyLevelInThePast12Months_BlackOrAfricanAmericanAlone",
        "Count_Person_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
        "Count_Person_BelowPovertyLevelInThePast12Months_NativeHawaiianOrOtherPacificIslanderAlone",
        "Count_Person_BelowPovertyLevelInThePast12Months_WhiteAlone",
      ],
      denominator: [
        "Count_Person_AmericanIndianOrAlaskaNativeAlone",
        "Count_Person_AsianAlone",
        "Count_Person_BlackOrAfricanAmericanAlone",
        "Count_Person_HispanicOrLatino",
        "Count_Person_NativeHawaiianOrOtherPacificIslanderAlone",
        "Count_Person_WhiteAlone",
      ],
      unit: "%",
      scaling: 100,
    };
    return (
      <>
        <div>{this.props.dcid}</div>
        <div>{this.props.placeName}</div>
        <div>{this.props.placeType}</div>
        <div>{this.props.topic}</div>
        <LineTile
          id={lineId}
          title={lineTitle}
          placeDcid={this.props.dcid}
          statVarMetadata={statVarMetadata}
        />
      </>
    );
  }
}

export { MainPane };
