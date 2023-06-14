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

interface HighlightTilePropType {
  description: string;
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec;
}

export function HighlightTile(props: HighlightTilePropType): JSX.Element {
  const [highlightData, setHighlightData] = useState<Observation | undefined>(
    null
  );

  useEffect(() => {
    (async () => {
      const data = await fetchData(props);
      setHighlightData(data);
    })();
  }, [props]);

  if (!highlightData) {
    return null;
  }
  const rs: ReplacementStrings = {
    placeName: props.place.name,
    date: highlightData.date,
  };
  const description = formatString(props.description, rs);
  return (
    <div
      className={`chart-container highlight-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
    >
      {highlightData && (
        <span className="stat">
          {formatNumber(
            highlightData.value,
            props.statVarSpec.unit,
            false,
            NUM_FRACTION_DIGITS
          )}
        </span>
      )}
      <span className="desc">{description}</span>
    </div>
  );
}

export const fetchData = async (props: HighlightTilePropType) => {
  // Now assume highlight only talks about one stat var.
  const mainStatVar = props.statVarSpec.statVar;
  const denomStatVar = props.statVarSpec.denom;
  const statVars = [mainStatVar];
  if (denomStatVar) {
    statVars.push(denomStatVar);
  }
  try {
    const resp = await axios.get<PointApiResponse>("/api/observations/point", {
      params: {
        entities: [props.place.dcid],
        variables: statVars,
      },
      paramsSerializer: stringifyFn,
    });

    const statData = resp.data.data;
    const mainStatData = statData[mainStatVar][props.place.dcid];
    let value = mainStatData.value;
    if (denomStatVar) {
      value /= statData[denomStatVar][props.place.dcid].value;
    }
    if (props.statVarSpec.scaling) {
      value *= props.statVarSpec.scaling;
    }
    return { value, date: mainStatData.date };
  } catch (error) {
    // TODO: add error message
    return null;
  }
};
