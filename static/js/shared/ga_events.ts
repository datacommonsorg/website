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
 * A helper function to trigger Google Analytics events for component impressions.
 * @param pageSource The path of the page where the component was successfully rendered.
 * @param component A descriptive name of the component to track for impressions.
 */
export function triggerComponentImpression(
  pageSource: string,
  component: string
): void {
  triggerGAEvent(GA_EVENT_COMPONENT_IMPRESSION, {
    [GA_PARAM_PAGE_SOURCE]: pageSource,
    [GA_PARAM_COMPONENT]: component,
  });
}

/**
 * A helper function to trigger Google Analytics events for component views.
 * @param pageSource The path of the page where the component was successfully viewed.
 * @param component A descriptive name of the component to track for views.
 * @param trackingMode Distinguishes between tracking initial and total views to have all view data in one place.
 */
export function triggerComponentView(
  pageSource: string,
  component: string,
  trackingMode: string
): void {
  triggerGAEvent(GA_EVENT_COMPONENT_VIEW, {
    [GA_PARAM_PAGE_SOURCE]: pageSource,
    [GA_PARAM_COMPONENT]: component,
    [GA_PARAM_VIEW_TRACKING_MODE]: trackingMode,
  });
}

/**
 * Triggered on soft page navigations. To track all page views (and disable GA page view tracking), set
 * manual_ga_pageview: true in the Jinja page render.
 */
export const GA_EVENT_PAGE_VIEW = "page_view";

/**
 * Triggered when a component to track is rendered.
 * Parameters:
 *  page_source : "explore",
 *  component: "related_topics_generated_questions" | "page_overview"
 */
export const GA_EVENT_COMPONENT_IMPRESSION = "component_impression";

/**
 * Triggered when a component to track is viewed.
 * Parameters:
 *  page_source : "explore",
 *  component: "page_overview"
 *  view_tracking_mode : "initial_views" | "total_view"
 */
export const GA_EVENT_COMPONENT_VIEW = "component_view";

/**
 * Triggered when unloading a page to track the total amount of time a component was viewed.
 * Parameters:
 *  page_source: "explore",
 *  component: "page_overview",
 *  total_view_time: The duration in which the component was on screen in ms.
 */
export const GA_EVENT_TOTAL_COMPONENT_VIEW_TIME = "total_component_view_time";

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
 * Parameters with value: {
 *                         source: "sv_search" | "sv_hierarchy",
 *                         stat_var: "Median_Income_Household",
 *                        }
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
 * Triggered when the NL Search bar is rendered.
 * Parameters:
 *   "dynamic_placeholders_enabled": Dynamic placeholder enablement.
 */
export const GA_EVENT_RENDER_NL_SEARCH_BAR = "nl_search_bar_render";

/**
 * Triggered when the NL Search bar is rendered with dynamic placeholders enabled.
 */
export const GA_EVENT_RENDER_NL_SEARCH_BAR_WITH_PLACEHOLDERS =
  "nl_search_bar_render_with_placeholders";

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
 * Triggered when users click on a related topics url to keep exploring.
 * It could either be the current Related Topics chip or the experimental Follow Up Questions.
 * Parameters:
 *   "related_topics_mode" : "related_topics_generated_questions" || "related_topics_header_topics"
 */
export const GA_EVENT_RELATED_TOPICS_CLICK = "related_topics_click";

/**
 * Triggered once when the Follow Up Questions component is in view.
 * Parameters:
 *  "related_topics_mode" : "related_topics_generated_questions" || "related_topics_header_topics"
 */
export const GA_EVENT_RELATED_TOPICS_VIEW = "related_topics_view";

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

/**
 * Triggered on autocomplete selections that redirect directly to the place page.
 * Parameters:
 *  "result_index": <index of the selected autocomplete result.
 */
export const GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE =
  "autocomplete_select_redirects_to_place";

/**
 * Triggered on autocomplete trigger.
 * Parameters:
 *    "query": <sample query>
 */
export const GA_EVENT_AUTOCOMPLETE_TRIGGERED = "autocomplete_trigger";

/**
 * Triggered on start of StatVar search.
 * Parameters: None
 */
export const GA_EVENT_STATVAR_SEARCH_TRIGGERED = "statvar_search_trigger";

/**
 * Triggered on selections of a StatVar search result.
 * Parameters:
 *    "query": <sample query>
 *    "search_selection": <DCID of the selected search result>
 */
export const GA_EVENT_STATVAR_SEARCH_SELECTION = "statvar_search_select";

/**
 * Triggered when any node on the StatVar hierarchy is clicked.
 * Parameters: None
 */
export const GA_EVENT_STATVAR_HIERARCHY_CLICK = "statvar_hierarchy_click";

/**
 * Triggered when an embedded link in the Page Overview is clicked.
 * Parameters:
 *    "click_tracking_mode": "initial_click" | "total_clicks"
 */
export const GA_EVENT_PAGE_OVERVIEW_CLICK = "page_overview_click";

/**
 * Triggered when the page overview loads from the API request
 * Parameters:
 *    "page_source": "explore"
 *    "component": "page_overview"
 *    "count_anchor_elements": Total number of anchor elements displayed.
 */
export const GA_EVENT_TOTAL_ANCHOR_COUNT = "total_anchor_count";

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
export const GA_PARAM_DYNAMIC_PLACEHOLDER = "dynamic_placeholders_enabled";
export const GA_PARAM_SEARCH_SELECTION = "search_selection";
export const GA_PARAM_RELATED_TOPICS_MODE = "related_topics_mode";
export const GA_PARAM_PAGE_SOURCE = "page_source";
export const GA_PARAM_COMPONENT = "component";
export const GA_PARAM_VIEW_TRACKING_MODE = "view_tracking_mode";
export const GA_PARAM_CLICK_TRACKING_MODE = "click_tracking_mode";
export const GA_PARAM_TOTAL_VIEW_TIME = "total_view_time";
export const GA_PARAM_COUNT_ANCHOR_ELEMENTS = "count_anchor_elements";

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
export const GA_VALUE_PAGE_EXPLORE = "explore";
export const GA_VALUE_SEARCH_SOURCE_EXPLORE_LANDING = "explore_landing";
export const GA_VALUE_SEARCH_SOURCE_HOMEPAGE = "homepage";
export const GA_VALUE_SEARCH_SOURCE_PLACE_PAGE = "place";
export const GA_VALUE_TOOL_STAT_VAR_OPTION_HIERARCHY = "sv_hierarchy";
export const GA_VALUE_TOOL_STAT_VAR_OPTION_SEARCH = "sv_search";
// Parameter value for GA_PARAM_RELATED_TOPICS_MODE to represent the Follow Up Questions mode.
export const GA_VALUE_RELATED_TOPICS_GENERATED_QUESTIONS =
  "related_topics_generated_questions";
// Parameter value for GA_PARAM_RELATED_TOPICS_MODE to represent the Related Topics mode in the Result Header.
export const GA_VALUE_RELATED_TOPICS_HEADER_TOPICS =
  "related_topics_header_topics";
export const GA_VALUE_PAGE_OVERVIEW = "page_overview";
export const GA_VALUE_INITIAL_VIEW = "initial_view";
export const GA_VALUE_TOTAL_VIEWS = "total_views";
export const GA_VALUE_INITIAL_CLICK = "initial_click";
export const GA_VALUE_TOTAL_CLICKS = "total_clicks";
