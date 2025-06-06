/**
 * Copyright 2025 Google LLC
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

import { intl } from "../i18n/i18n";
import { periodicityMessages } from "../i18n/i18n_periodicity_messages";

/**
 * This function takes an ISO 8601 duration (https://en.wikipedia.org/wiki/ISO_8601#Durations)
 * and converts it to a human-readable format. These durations, such as P1D or P1Y are
 * used in metadata to indicate periodicity.
 *
 * Examples:
 *   P1Y   -> "Yearly"
 *   P3M   -> "Every 3 months"
 *   P1W   -> "Weekly"
 *   P5D   -> "Every 5 days"
 *   PT6H  -> "Every 6 hours"
 *   PT30M -> "Every 30 minutes"
 *   PT1S  -> "Every second"
 *   P1Y2M -> "Every 1 year and 2 months"
 *
 *   Note that these are subject to translation, and this can only be used in a context
 *   where intl is available.
 */
export function humanizeIsoDuration(iso: string): string {
  const match = iso.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );

  if (!match) return iso;

  const [, years, months, weeks, days, hours, minutes, seconds] = match.map(
    (v) => (v === undefined ? 0 : parseInt(v, 10))
  );

  const units = [
    { value: years, messageKey: "yearPeriod" },
    { value: months, messageKey: "monthPeriod" },
    { value: weeks, messageKey: "weekPeriod" },
    { value: days, messageKey: "dayPeriod" },
    { value: hours, messageKey: "hourPeriod" },
    { value: minutes, messageKey: "minutePeriod" },
    { value: seconds, messageKey: "secondPeriod" },
  ];

  const activeUnits = units.filter((unit) => unit.value > 0);

  if (activeUnits.length === 0) return iso;

  if (activeUnits.length === 1) {
    const unit = activeUnits[0];
    return intl.formatMessage(periodicityMessages[unit.messageKey], {
      count: unit.value,
    });
  }

  const formattedParts = activeUnits.map((unit) => {
    return intl.formatMessage(periodicityMessages[unit.messageKey + "Unit"], {
      count: unit.value,
    });
  });

  let formattedList: string;
  if (formattedParts.length === 2) {
    formattedList = intl.formatMessage(periodicityMessages.listTwo, {
      0: formattedParts[0],
      1: formattedParts[1],
    });
  } else {
    const allButLast = formattedParts.slice(0, -1);
    const lastItem = formattedParts[formattedParts.length - 1];

    let itemsList = allButLast[0];
    for (let i = 1; i < allButLast.length; i++) {
      itemsList = intl.formatMessage(periodicityMessages.listComma, {
        0: itemsList,
        1: allButLast[i],
      });
    }

    formattedList = intl.formatMessage(periodicityMessages.listMoreThanTwo, {
      items: itemsList,
      lastItem,
    });
  }

  return intl.formatMessage(periodicityMessages.multiplePeriod, {
    units: formattedList,
  });
}
