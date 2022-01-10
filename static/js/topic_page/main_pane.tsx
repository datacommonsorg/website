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

import { StatVarMetadata } from "../types/stat_var";
import { LineTile } from "./line_tile";
import { MapTile } from "./map_tile";

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
    const mapId = "map-1";
    const mapTitle = "map-title";
    const statVarMetadata: StatVarMetadata = {
      statVars: [
        {
          main:
            "Count_Person_BelowPovertyLevelInThePast12Months_AmericanIndianOrAlaskaNativeAlone",
          denom: "Count_Person_AmericanIndianOrAlaskaNativeAlone",
        },
        {
          main: "Count_Person_BelowPovertyLevelInThePast12Months_AsianAlone",
          denom: "Count_Person_AsianAlone",
        },
        {
          main:
            "Count_Person_BelowPovertyLevelInThePast12Months_BlackOrAfricanAmericanAlone",
          denom: "Count_Person_BlackOrAfricanAmericanAlone",
        },
        {
          main:
            "Count_Person_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
          denom: "Count_Person_HispanicOrLatino",
        },
        {
          main:
            "Count_Person_BelowPovertyLevelInThePast12Months_NativeHawaiianOrOtherPacificIslanderAlone",
          denom: "Count_Person_NativeHawaiianOrOtherPacificIslanderAlone",
        },
        {
          main: "Count_Person_BelowPovertyLevelInThePast12Months_WhiteAlone",
          denom: "Count_Person_WhiteAlone",
        },
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
        <MapTile
          id={mapId}
          title={mapTitle}
          placeDcid={this.props.dcid}
          enclosedPlaceType={"State"}
          statVarMetadata={statVarMetadata}
        />
      </>
    );
  }
}

export { MainPane };
