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
 * Triggers events and send data to google analytics.
 * @param eventName name of the event
 * @param parameter parameter-value pairs
 */
export function triggerGAEvent(
  eventName: string,
  parameter: Record<string, string | string[]>
): void {
  if (window.gtag) {
    window.gtag("event", eventName, parameter);
  }
}

/**
 * Event name: place_category_click
 * Triggered when: users click on the category redirect link in the place explorer page.
 * Parameters with value: {
 *                         place_category_click_source : "sidebar" or "chart header" or "more charts",
 *                         place_category_click: "Overview" or "Economics" or "Health"...,
 *                        }
 */
export const GA_EVENT_PLACE_CATEGORY_CLICK = "place_category_click";
/**
 * Event name: place_chart_click
 * Triggered when: users click on any of the buttons below a place explorer chart.
 * Parameters with value: {
 *                         place_chart_click: "stat var chip" or "data source" or "export" or "explore more"
 *                        }
 */
export const GA_EVENT_PLACE_CHART_CLICK = "place_chart_click";
/**
 * Event name: tool_chart_plot
 * Triggered when: a tool chart is mounted or updated with different stat vars or places.
 * Parameters with value: {
 *                         stat_var: "Median_Income_Household" or ["Median_Income_Household", "Age"],
 *                         place_dcid: "geoId/06" or ["geoId/06", "geoId/48"],
 *                        }
 */
export const GA_EVENT_TOOL_CHART_PLOT = "tool_chart_plot";
/**
 * Event name: tool_stat_var_click
 * Triggered when: a stat var is selected in the stat var hierarchy.
 * Parameters with value: { stat_var: "Median_Income_Household" }
 */
export const GA_EVENT_TOOL_STAT_VAR_CLICK = "tool_stat_var_click";
/**
 * Event name: tool_place_add
 * Triggered when: a place is added to the place search bar of visualization tools.
 * Parameters with value: { place_dcid: "geoId/06" }
 */
export const GA_EVENT_TOOL_PLACE_ADD = "tool_place_add";
/**
 * Event name: tool_stat_var_search_no_result
 * Triggered when: no result is shown for a search term in the stat var widget.
 * Parameters with value: { search_term: "median income" }
 */
export const GA_EVENT_TOOL_STAT_VAR_SEARCH_NO_RESULT =
  "tool_stat_var_search_no_result";
/**
 * Event name: tool_chart_option_click
 * Triggered when: a tool chart option is selected or blured (population filter) or updated (sources).
 * Parameters with value: {
 *                         tool_chart_option: "per capita" or "delta" or "log scale" or "show quadrants"
 *                         or "show labels" or "show density" or "edit sources" or "filter by population"
 *                        }
 */
export const GA_EVENT_TOOL_CHART_OPTION_CLICK = "tool_chart_option_click";

// GA event parameters
export const GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE =
  "place_category_click_source";
export const GA_PARAM_PLACE_CATEGORY_CLICK = "place_category_click";
export const GA_PARAM_PLACE_CHART_CLICK = "place_chart_click";
export const GA_PARAM_STAT_VAR = "stat_var";
export const GA_PARAM_PLACE_DCID = "place_dcid";
export const GA_PARAM_SEARCH_TERM = "search_term";
export const GA_PARAM_TOOL_CHART_OPTION = "tool_chart_option";

//GA event parameter values
export const GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP = "stat var chip";
export const GA_VALUE_PLACE_CHART_CLICK_DATA_SOURCE = "data source";
export const GA_VALUE_PLACE_CHART_CLICK_EXPORT = "export";
export const GA_VALUE_PLACE_CHART_CLICK_EXPLORE_MORE = "explore more";
export const GA_VALUE_PLACE_CATEGORY_CLICK_OVERVIEW = "overview";
export const GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_SIDEBAR = "sidebar";
export const GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_CHART_HEADER = "chart header";
export const GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_MORE_CHARTS = "more charts";
export const GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA = "per capita";
export const GA_VALUE_TOOL_CHART_OPTION_DELTA = "delta";
export const GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE = "log scale";
export const GA_VALUE_TOOL_CHART_OPTION_SWAP = "swap x and y axis";
export const GA_VALUE_TOOL_CHART_OPTION_SHOW_QUADRANTS = "show quadrants";
export const GA_VALUE_TOOL_CHART_OPTION_SHOW_LABELS = "show labels";
export const GA_VALUE_TOOL_CHART_OPTION_SHOW_DENSITY = "show density";
export const GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES = "edit sources";
export const GA_VALUE_TOOL_CHART_OPTION_FILTER_BY_POPULATION =
  "filter by population";
