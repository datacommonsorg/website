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

/**
 * Note to translators:
 * Some of these translations use ICU message formats for handling plurals
 * and combinations
 * .
 * For more information, see:
 * https://formatjs.github.io/docs/core-concepts/icu-syntax#plural-format
 *
 * defaultMessage: "{count, plural, one {# month} other {# months}}",
 * In Spanish would be: "{count, plural, one {# mes} other {# meses}}
 */

import { defineMessages } from "react-intl";

export const periodicityMessages = defineMessages({
  yearPeriod: {
    id: "periodicity.period.year",
    defaultMessage: "{count, plural, one {Yearly} other {Every # years}}",
    description:
      "Pattern for yearly periodicity with plural handling. English: Yearly, Every 2 years",
  },
  monthPeriod: {
    id: "periodicity.period.month",
    defaultMessage: "{count, plural, one {Monthly} other {Every # months}}",
    description:
      "Pattern for monthly periodicity with plural handling. English: Monthly, Every 2 months",
  },
  weekPeriod: {
    id: "periodicity.period.week",
    defaultMessage: "{count, plural, one {Weekly} other {Every # weeks}}",
    description:
      "Pattern for weekly periodicity with plural handling. English: Weekly, Every 2 weeks",
  },
  dayPeriod: {
    id: "periodicity.period.day",
    defaultMessage: "{count, plural, one {Daily} other {Every # days}}",
    description:
      "Pattern for daily periodicity with plural handling. English: Daily, Every 2 days",
  },
  hourPeriod: {
    id: "periodicity.period.hour",
    defaultMessage: "{count, plural, one {Hourly} other {Every # hours}}",
    description:
      "Pattern for hourly periodicity with plural handling. English: Hourly, Every 2 hours",
  },
  minutePeriod: {
    id: "periodicity.period.minute",
    defaultMessage:
      "{count, plural, one {Every minute} other {Every # minutes}}",
    description:
      "Pattern for minute periodicity with plural handling. English: Every minute, Every 2 minutes",
  },
  secondPeriod: {
    id: "periodicity.period.second",
    defaultMessage:
      "{count, plural, one {Every second} other {Every # seconds}}",
    description:
      "Pattern for second periodicity with plural handling. English: Every second, Every 2 seconds",
  },
  // The messages below are used when we have a duration that contains multiple periods.
  // For example: 1 year and 6 months.
  yearPeriodUnit: {
    id: "periodicity.unit.year",
    defaultMessage: "{count, plural, one {# year} other {# years}}",
    description:
      "Year unit with count variable for translations. English: 1 year, 2 years",
  },
  monthPeriodUnit: {
    id: "periodicity.unit.month",
    defaultMessage: "{count, plural, one {# month} other {# months}}",
    description:
      "Month unit with count variable for translations. English: 1 month, 2 months",
  },
  weekPeriodUnit: {
    id: "periodicity.unit.week",
    defaultMessage: "{count, plural, one {# week} other {# weeks}}",
    description:
      "Week unit with count variable for translations. English: 1 week, 2 weeks",
  },
  dayPeriodUnit: {
    id: "periodicity.unit.day",
    defaultMessage: "{count, plural, one {# day} other {# days}}",
    description:
      "Day unit with count variable for translations. English: 1 day, 2 days",
  },
  hourPeriodUnit: {
    id: "periodicity.unit.hour",
    defaultMessage: "{count, plural, one {# hour} other {# hours}}",
    description:
      "Hour unit with count variable for translations. English: 1 hour, 2 hours",
  },
  minutePeriodUnit: {
    id: "periodicity.unit.minute",
    defaultMessage: "{count, plural, one {# minute} other {# minutes}}",
    description:
      "Minute unit with count variable for translations. English: 1 minute, 2 minutes",
  },
  secondPeriodUnit: {
    id: "periodicity.unit.second",
    defaultMessage: "{count, plural, one {# second} other {# seconds}}",
    description:
      "Second unit with count variable for translations. English: 1 second, 2 seconds",
  },
  // The messages below determine how more complex periods are put together.
  multiplePeriod: {
    id: "periodicity.multiple",
    defaultMessage: "Every {units}",
    description:
      "Pattern for multiple time units where {units} is the formatted list of units. English: Every 1 day and 2 hours",
  },
  listTwo: {
    id: "periodicity.list.two",
    defaultMessage: "{0} and {1}",
    description:
      "Pattern for joining two time units. English: 1 day and 2 hours",
  },
  listMoreThanTwo: {
    id: "periodicity.list.moreThanTwo",
    defaultMessage: "{items} and {lastItem}",
    description:
      "Pattern for joining more than two time units, where {items} is the comma-separated list and {lastItem} is the final item. English: 1 day, 2 hours and 3 minutes",
  },
  listComma: {
    id: "periodicity.list.comma",
    defaultMessage: "{0}, {1}",
    description:
      "Pattern for joining two items with a comma in a list. English: 1 day, 2 hours",
  },
});
