/**
 * Copyright 2023 Google LLC
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
 * Component for rendering a highlight tile.
 */

import axios from "axios";
import React, { useEffect, useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { formatNumber } from "../../i18n/i18n";
import { Observation, PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { stringifyFn } from "../../utils/axios";
import { formatString, ReplacementStrings } from "../../utils/tile_utils";

const NUM_FRACTION_DIGITS = 1;

export interface HighlightTilePropType {
  // API root for data fetch
  apiRoot?: string;
  // Date to fetch data for
  date?: string;
  // Text to accompany the stat var value highlighted
  description: string;
  // Place to get data for
  place: NamedTypedPlace;
  // Variable to get data for
  statVarSpec: StatVarSpec;
}

export function HighlightTile(props: HighlightTilePropType): JSX.Element {
  const [highlightData, setHighlightData] = useState<Observation | undefined>(
    null
  );

  useEffect(() => {
    fetchData(props).then((data) => {
      setHighlightData(data);
    });
  }, [props]);

  if (!highlightData) {
    return null;
  }
  const rs: ReplacementStrings = {
    placeName: props.place.name,
    date: highlightData.date,
  };
  let description = "";
  if (props.description) {
    description = formatString(props.description, rs);
  }
  // TODO: The {...{ part: "container"}} syntax to set a part is a hacky
  // workaround to add a "part" attribute to a React element without npm errors.
  // This hack should be cleaned up.
  return (
    <div
      className={`chart-container highlight-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      {...{ part: "container" }}
    >
      {highlightData && (
        <span className="stat">
          {formatNumber(
            highlightData.value,
            props.statVarSpec.unit || highlightData.unitDisplayName,
            false,
            NUM_FRACTION_DIGITS
          )}
          {` (${highlightData.date})`}
        </span>
      )}
      <span className="desc">{description}</span>
    </div>
  );
}

const fetchData = (props: HighlightTilePropType): Promise<Observation> => {
  // Now assume highlight only talks about one stat var.
  const mainStatVar = props.statVarSpec.statVar;
  const denomStatVar = props.statVarSpec.denom;
  const statVars = [mainStatVar];
  if (denomStatVar) {
    statVars.push(denomStatVar);
  }
  return axios
    .get<PointApiResponse>(`${props.apiRoot || ""}/api/observations/point`, {
      params: {
        date: props.date,
        entities: [props.place.dcid],
        variables: statVars,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      const statData = resp.data.data;
      const mainStatData = statData[mainStatVar][props.place.dcid];
      let value = mainStatData.value;
      const facet = resp.data.facets[mainStatData.facet];
      if (denomStatVar) {
        value /= statData[denomStatVar][props.place.dcid].value;
      }
      if (props.statVarSpec.scaling) {
        value *= props.statVarSpec.scaling;
      }
      const result = { value, date: mainStatData.date };
      if (facet && facet.unitDisplayName) {
        result["unitDisplayName"] = facet.unitDisplayName;
      }
      return result;
    })
    .catch(() => {
      return null;
    });
};
