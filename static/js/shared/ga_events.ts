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
 * Triggered on soft page navigations. To track all page views (and disable GA page view tracking), set
 * manual_ga_pageview: true in the Jinja page render.
 */
export const GA_EVENT_PAGE_VIEW = "page_view";

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

/**
 * Triggered when query is submitted in NL search.
 * Parameters:
 *   "query": search query
 *   "source": "homepage" | "explore_landing" | "explore"
 */
export const GA_EVENT_NL_SEARCH = "explore_search_q";

/**
 * Triggered when detection results are returned in NL search.
 * Parameters:
 *   "query": search query
 *   "time_ms": e2e request/response timing in ms.
 */
export const GA_EVENT_NL_DETECT_FULFILL = "explore_detect_fulfill";

/**
 * Triggered when detection results are returned in NL search.
 * Parameters:
 *   "topic": array of topics
 *   "time_ms": e2e request/response timing in ms.
 */
export const GA_EVENT_NL_FULFILL = "explore_fulfill";

/**
 * Triggered when "download" button is clicked on a tile.
 * Parameters:
 *    "type": "Timeline Tool" | "Scatter Tool" | "Map Tool" | ""
 */
export const GA_EVENT_TILE_DOWNLOAD = "tile_download";

/**
 * Triggered when "download image" button is clicked on a tile download modal.
 * Parameters: None
 */
export const GA_EVENT_TILE_DOWNLOAD_IMG = "tile_download_image";

/**
 * Triggered when "download CSV" button is clicked on a tile download modal.
 * Parameters: None
 */
export const GA_EVENT_TILE_DOWNLOAD_CSV = "tile_download_csv";

/**
 * Triggered when "Explore in ..." is clicked on Explore tiles.
 * Parameters:
 *    "type": "Timeline Tool" | "Scatter Tool" | "Map Tool"
 */
export const GA_EVENT_TILE_EXPLORE_MORE = "tile_explore_more";

/**
 * Triggered when tile source link is clicked.
 * Parameters:
 *    "url": <destination source URL>
 */
export const GA_EVENT_TILE_SOURCE = "tile_source";

/**
 * Triggered on header menu & navigation clicks.
 * Parameters:
 *    "id": desktop|mobile main|submenu <menu_id> ?<index>
 *    "url": <destination source URL>
 */
export const GA_EVENT_HEADER_CLICK = "header_click";

/**
 * Triggered on homepage clicks.
 * Parameters:
 *    "id": topic|sample-q single|<id>
 *    "url"?: <destination source URL>
 *    "query"?: <sample query>
 */
export const GA_EVENT_HOMEPAGE_CLICK = "homepage_click";

/**
 * Triggered on build / custom_dc clicks.
 * Parameters:
 *    "id": topic|sample-q single|<id>
 *    "url": <destination source URL>
 */
export const GA_EVENT_BUILDPAGE_CLICK = "buildpage_click";

/**
 * Triggered on autocomplete selections.
 * Parameters:
 *   "result_index": <index of the selected autocomplete result>
 */
export const GA_EVENT_AUTOCOMPLETE_SELECTION = "autocomplete_select";

// GA event parameters
export const GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE =
  "place_category_click_source";
export const GA_PARAM_PLACE_CATEGORY_CLICK = "place_category_click";
export const GA_PARAM_PLACE_CHART_CLICK = "place_chart_click";
export const GA_PARAM_STAT_VAR = "stat_var";
export const GA_PARAM_PLACE_DCID = "place_dcid";
export const GA_PARAM_SEARCH_TERM = "search_term";
export const GA_PARAM_TOOL_CHART_OPTION = "tool_chart_option";
export const GA_PARAM_TILE_TYPE = "type";
export const GA_PARAM_QUERY = "query";
export const GA_PARAM_URL = "url";
export const GA_PARAM_ID = "id";
export const GA_PARAM_SOURCE = "source";
export const GA_PARAM_TOPIC = "topic";
export const GA_PARAM_PLACE = "place";
export const GA_PARAM_TIMING_MS = "time_ms";
export const GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX = "selection_index";

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
export const GA_VALUE_TOOL_CHART_OPTION_SHOW_POPULATION_OFF =
  "show population off";
export const GA_VALUE_TOOL_CHART_OPTION_SHOW_POPULATION_LINEAR =
  "show population linear";
export const GA_VALUE_TOOL_CHART_OPTION_SHOW_POPULATION_LOG =
  "show population log";
export const GA_VALUE_TOOL_CHART_OPTION_EDIT_SOURCES = "edit sources";
export const GA_VALUE_TOOL_CHART_OPTION_FILTER_BY_POPULATION =
  "filter by population";
export const GA_VALUE_SEARCH_SOURCE_EXPLORE = "explore";
export const GA_VALUE_SEARCH_SOURCE_EXPLORE_LANDING = "explore_landing";
export const GA_VALUE_SEARCH_SOURCE_HOMEPAGE = "homepage";
export const GA_VALUE_SEARCH_SOURCE_PLACE_PAGE = "place";
