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
 * Component for rendering the selectors section for a disaster event map tile.
 */

import React, { useEffect, useRef, useState } from "react";
import { CustomInput } from "reactstrap";

import {
  DATE_OPTION_1Y_KEY,
  DATE_OPTION_6M_KEY,
  DATE_OPTION_30D_KEY,
  URL_HASH_PARAM_KEYS,
} from "../../constants/disaster_event_map_constants";
import { NamedTypedPlace } from "../../shared/types";
import { EventTypeSpec } from "../../types/subject_page_proto_types";
import {
  fetchDateList,
  getDate,
  getUseCache,
  setUrlHash,
} from "../../utils/disaster_event_map_utils";

const DATE_OPTION_DISPLAY_NAMES = {
  [DATE_OPTION_30D_KEY]: "Last 30 days",
  [DATE_OPTION_6M_KEY]: "Last 6 months",
  [DATE_OPTION_1Y_KEY]: "Last year",
};

interface DisasterEventMapSelectorsPropType {
  // id of the block this component is in.
  blockId: string;
  // Map of eventType id to EventTypeSpec
  eventTypeSpec: Record<string, EventTypeSpec>;
  // Place to show the event map for
  place: NamedTypedPlace;
  children?: React.ReactNode;
}

export function DisasterEventMapSelectors(
  props: DisasterEventMapSelectorsPropType
): JSX.Element {
  const [dateOptions, setDateOptions] = useState([]);
  // Whether date options retrieved are from the cache or not.
  const dateOptionsUseCache = useRef<boolean>(null);

  useEffect(() => {
    // When props change, update date options & update the hash change listener.
    updateDateOptions(props.eventTypeSpec, props.place.dcid);

    function handleHashChange(): void {
      updateDateOptions(props.eventTypeSpec, props.place.dcid);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [props]);

  return (
    <div className="disaster-event-map-selectors-section">
      <div className="disaster-event-map-date-selector">
        Date:
        <CustomInput
          id="disaster-event-map-date-selector-input"
          type="select"
          value={getDate(props.blockId)}
          onChange={(e) => {
            setUrlHash(URL_HASH_PARAM_KEYS.DATE, e.target.value, props.blockId);
          }}
        >
          {dateOptions.map((date) => {
            return (
              <option value={date} key={date}>
                {DATE_OPTION_DISPLAY_NAMES[date] || date}
              </option>
            );
          })}
        </CustomInput>
      </div>
      {props.children}
    </div>
  );

  /**
   * Updates date info given an event type spec
   */
  function updateDateOptions(
    eventTypeSpec: Record<string, EventTypeSpec>,
    selectedPlace: string
  ): void {
    const eventTypeDcids = Object.values(eventTypeSpec).flatMap(
      (spec) => spec.eventTypeDcids
    );
    const useCache = getUseCache();
    if (
      dateOptionsUseCache.current &&
      dateOptionsUseCache.current === useCache
    ) {
      return;
    }
    dateOptionsUseCache.current = useCache;
    const customDateOptions = [
      DATE_OPTION_30D_KEY,
      DATE_OPTION_6M_KEY,
      DATE_OPTION_1Y_KEY,
    ];
    fetchDateList(eventTypeDcids, selectedPlace, useCache)
      .then((dateList) => {
        const currDate = getDate(props.blockId);
        const dateOptions = [...customDateOptions, ...dateList];
        setDateOptions(dateOptions);
        // if current date is not in the new date options, set selected date to be
        // default (1 year).
        if (dateOptions.findIndex((date) => date === currDate) < 0) {
          setUrlHash(
            URL_HASH_PARAM_KEYS.DATE,
            DATE_OPTION_1Y_KEY,
            props.blockId
          );
        }
      })
      .catch(() => {
        setDateOptions(customDateOptions);
        // if empty date list, set selected date to be default (1 year).
        setUrlHash(URL_HASH_PARAM_KEYS.DATE, DATE_OPTION_1Y_KEY, props.blockId);
      });
  }
}
