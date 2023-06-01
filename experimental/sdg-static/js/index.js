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

// lodash templates
const BLOCK_TEMPLATE = "./templates/block.template.html";
const SIDEBAR_ITEM_TEMPLATE = "./templates/sidebar_item.template.html";

// Application config path
const SDG_CONFIG = "./config/sdg.json";

// Template cache
const TEMPLATES = {
  block: _.template(""),
  sidebarItem: _.template(""),
};

// Global application state
const STATE = {
  sdg: {
    names: [],
    blocks: [],
  },
};

/**
 * Initializes global application state configuration
 */
async function initializeState() {
  const sdgConfig = await (await fetch(SDG_CONFIG)).json();
  STATE.sdg = sdgConfig;
}

/**
 * Fetch and build lodash embedded javascript templates
 */
async function initializeTemplates() {
  // Fetch templates simultaneously
  const blockTemplateRequest = fetch(BLOCK_TEMPLATE);
  const sidebarItemTemplateRequest = fetch(SIDEBAR_ITEM_TEMPLATE);

  // Wait for content
  const blockTemplateContent = await (await blockTemplateRequest).text();
  const sidebarItemTemplateContent = await (
    await sidebarItemTemplateRequest
  ).text();

  // Build templates
  TEMPLATES.block = _.template(blockTemplateContent);
  TEMPLATES.sidebarItem = _.template(sidebarItemTemplateContent);
}

/**
 * Loads SDG indicator blocks
 */
function renderBlocks() {
  const $mainContainer = $("#main-container");
  STATE.sdg.blocks.forEach((block, index) => {
    const blockId = `sdg-block-${index}`;
    // Render block
    $mainContainer.append(
      TEMPLATES.block({
        title: block.name,
        id: blockId,
      })
    );

    // Render charts
    const $chartContainer = $(`#${blockId}`);
    block.charts.forEach((chart) => {
      renderChart($chartContainer, chart);
    });
  });
}

/**
 * Renders a data commons chart
 */
function renderChart($container, chartConfig) {
  if (chartConfig.type == "BAR") {
    const chartElement = document.createElement("div");
    $container.append(chartElement);
    var lineChartProps = {
      id: _.uniqueId("chart-"),
      svgChartHeight: 200,
      className: undefined,
      apiRoot: datacommons.root,
      isDataTile: false,
      ...chartConfig.config,
    };
    datacommons.drawBar(chartElement, lineChartProps);
  } else if (chartConfig.type == "LINE") {
    const chartElement = document.createElement("div");
    $container.append(chartElement);
    var lineChartProps = {
      id: _.uniqueId("chart-"),
      svgChartHeight: 150,
      className: undefined,
      apiRoot: datacommons.root,
      isDataTile: false,
      ...chartConfig.config,
    };
    datacommons.drawLine(chartElement, lineChartProps);
  } else if (chartConfig.type == "MAP") {
    const chartElement = document.createElement("div");
    $container.append(chartElement);
    var mapChartProps = {
      id: _.uniqueId("chart-"),
      svgChartHeight: 250,
      className: undefined,
      apiRoot: datacommons.root,
      isDataTile: false,
      ...chartConfig.config,
    };
    datacommons.drawMap(chartElement, mapChartProps);
  } else if (chartConfig.type == "RANKING") {
    const chartElement = document.createElement("div");
    $container.append(chartElement);
    var props1 = {
      placeName: "USA",
      placeType: "State",
      withinPlace: "country/USA",
      statVar: "Count_Person",
      isPerCapita: false,
      scaling: 1,
      unit: "",
      date: "2020",
    };
    datacommons.drawRanking(chartElement, chartConfig.config);
  } else {
    console.log("Skipping unknown chart type", chartConfig.type);
  }
}

/**
 * Renders page sidebar
 */
async function renderSidebar() {
  const $sidebarContainer = $("#sidebar-container");
  STATE.sdg.names.forEach((sdgName, index) => {
    $sidebarContainer.append(
      TEMPLATES.sidebarItem({
        index,
        name: sdgName,
      })
    );
  });
}

/**
 * Application entry point
 */
async function main() {
  await initializeState();
  await initializeTemplates();
  renderSidebar();
  renderBlocks();
}

// Initialize application when window loads
window.onload = () => main();
