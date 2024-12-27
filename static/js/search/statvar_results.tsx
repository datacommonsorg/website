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
 * Result section for matching stat vars
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";

import { getStatVarInfo } from "../shared/stat_var";
import { NamedNode } from "../shared/types";

const NUM_EXAMPLE_SV = 10;
const SV_EXPLORER_REDIRECT_PREFIX = "/tools/statvar#sv=";
const BROWSER_REDIRECT_PREFIX = "/browser/";

interface StatVarResultsProps {
  statVars: NamedNode[];
  selectedSV: string;
}

export function StatVarResults(props: StatVarResultsProps): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const [selectedSv, setSelectedSv] = useState(null);

  useEffect(() => {
    if (props.selectedSV) {
      getStatVarInfo([props.selectedSV])
        .then((svInfo) => {
          setSelectedSv({
            dcid: props.selectedSV,
            name: svInfo[props.selectedSV].title || props.selectedSV,
          });
        })
        .catch(() => {
          setSelectedSv({
            dcid: props.selectedSV,
            name: props.selectedSV,
          });
        });
    }
  }, [props]);

  if (_.isEmpty(selectedSv) && _.isEmpty(props.statVars)) {
    return <></>;
  }
  const shownStatVars = showAll
    ? props.statVars
    : props.statVars.slice(0, Math.min(props.statVars.length, NUM_EXAMPLE_SV));
  const canExpand = props.statVars.length > NUM_EXAMPLE_SV && !showAll;
  return (
    <div className="search-results-sv search-results-section">
      {selectedSv ? (
        <div className="search-results-sv-selected">
          {getResultItemContentJsx(selectedSv, true)}
        </div>
      ) : (
        <>
          <h2 className="search-results-section-title">
            Statistical Variables
          </h2>
          <div className="search-results-section-content">
            <div className="search-results-list">
              {shownStatVars.map((sv) => {
                return getResultItemContentJsx(sv, false);
              })}
            </div>
            {canExpand && (
              <div
                onClick={(): void => setShowAll(true)}
                className="search-results-sv-show-more"
              >
                show {props.statVars.length - NUM_EXAMPLE_SV} more
              </div>
            )}
            {showAll && (
              <div
                onClick={(): void => setShowAll(false)}
                className="search-results-sv-show-more"
              >
                show less
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getResultItemContentJsx(
  sv: NamedNode,
  isFullSize: boolean
): JSX.Element {
  return (
    <div key={`sv-result-${sv.dcid}`} className="search-results-item">
      {isFullSize ? (
        <div className="search-results-item-title">{sv.name}</div>
      ) : (
        <a
          href={SV_EXPLORER_REDIRECT_PREFIX + sv.dcid}
          className="search-results-item-title"
        >
          {sv.name}
        </a>
      )}
      <a
        href={BROWSER_REDIRECT_PREFIX + sv.dcid}
        className="search-results-item-byline"
      >
        dcid: {sv.dcid}
      </a>
      {isFullSize && (
        <a href={SV_EXPLORER_REDIRECT_PREFIX + sv.dcid}>
          Open in stat var explorer
        </a>
      )}
    </div>
  );
}
