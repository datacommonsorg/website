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

import axios from "axios";
import React, { useEffect, useState } from "react";

import { formatNumber } from "../i18n/i18n";
import { GetStatSetResponse } from "../tools/shared_util";
import { StatVarMetadata } from "../types/stat_var";

const NUM_FRACTION_DIGITS = 1;

interface HighlightTilePropType {
  description: string;
  placeDcid: string;
  statVarMetadata: StatVarMetadata[];
}

export function HighlightTile(props: HighlightTilePropType): JSX.Element {
  const [highlightData, setHighlightData] = useState<number | undefined>(null);

  useEffect(() => {
    fetchData(props, setHighlightData);
  }, [props]);

  return (
    <div className="chart-container highlight-tile">
      {highlightData && (
        <span className="stat">
          {formatNumber(
            highlightData,
            props.statVarMetadata[0].unit,
            false,
            NUM_FRACTION_DIGITS
          )}
        </span>
      )}
      <span className="desc">{props.description}</span>
    </div>
  );
}

function fetchData(
  props: HighlightTilePropType,
  setHighlightData: (data: number) => void
): void {
  // Now assume highlight only talks about one stat var.
  const mainStatVar = props.statVarMetadata[0].statVar;
  const denomStatVar = props.statVarMetadata[0].denom;
  const statVars = [mainStatVar];
  if (denomStatVar) {
    statVars.push(denomStatVar);
  }
  axios
    .post<GetStatSetResponse>("/api/stats/set", {
      places: [props.placeDcid],
      stat_vars: statVars,
    })
    .then((resp) => {
      const statData = resp.data.data;
      let value = statData[mainStatVar].stat[props.placeDcid].value;
      if (denomStatVar) {
        value /= statData[denomStatVar].stat[props.placeDcid].value;
      }
      if (props.statVarMetadata[0].scaling) {
        value *= props.statVarMetadata[0].scaling;
      }
      setHighlightData(value);
    });
}
