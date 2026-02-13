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

/**
 * Health Data Commons Homepage
 * Manages city selection, data visualization, and widget updates
 */

import { fetchData, getApiRoot } from '../../utils/api.js';

// ============================================================================
// Constants and Configuration
// ============================================================================

const CONFIG = {
  MAX_CITIES: 4,
  SCROLL_THRESHOLD: 100,
  HERO_MAX_HEIGHT: '31.25rem',
  CHART_HEIGHT_LINE: '530px',
  CHART_HEIGHT_BAR: '550px',
  CHART_STYLE: {
    width: '100%',
    maxWidth: '100%',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 1px 2px rgba(33,33,33,0.04)',
    border: '1px solid #E0E0E0',
    padding: '32px',
    display: 'block',
    boxSizing: 'border-box'
  }
};

const HEALTH_VARIABLES = {
  LINE_CHART: 'Percent_Person_WithHealthyVitaminD Percent_Person_Vaccinated Percent_Person_Sick Percent_Person_WithAsthma Percent_Person_WithDiabetes Percent_Person_WithHighBloodPressure Percent_Person_Smoking Percent_Person_PhysicalInactivity',
  BAR_CHART: 'Percent_Person_WithHealthyVitaminD Percent_Person_Vaccinated Percent_Person_Sick Percent_Person_WithDiabetes Percent_Person_WithHighBloodPressure Percent_Person_WithAsthma Percent_Person_Smoking Percent_Person_PhysicalInactivity',
  COLORS: '#FFD700 #4CAF50 #F44336 #8B0000 #B22222 #DC143C #F4A460 #FFB6C1'
};

const CITY_DATA = {
  AVAILABLE: [
    'Boston, MA',
    'Houston, TX',
    'Los Angeles, CA',
    'San Antonio, TX',
    'Austin, TX',
    'Nashville, TN',
    'San Diego, CA',
    'Sacramento, CA'
  ],
  GEO_IDS: {
    'Boston, MA': 'geoId/2507000',
    'Houston, TX': 'geoId/4835000',
    'Los Angeles, CA': 'geoId/0644000',
    'San Antonio, TX': 'geoId/4865000',
    'Austin, TX': 'geoId/4805000',
    'Nashville, TN': 'geoId/4752006',
    'San Diego, CA': 'geoId/0666000',
    'Sacramento, CA': 'geoId/0664000'
  }
};

const WIDGET_IDS = {
  HIGHLIGHTS: [
    'highlightObesity',
    'highlightSmoking',
    'highlightPhysicalHealth',
    'highlightDiabetes',
    'highlightHighBloodPressure',
    'highlightVitaminD',
    'highlightVaccination',
    'highlightSickPeople',
    'metricsUpdated',
    'newDatasets',
    'dataCoverage'
  ],
  CONTAINERS: {
    CHARTS: 'pie-charts-container',
    CITY_SELECT: 'city-select-row',
    SECTION_TITLE: 'key-health-indicators-title'
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
* Get element by ID with error handling
*/
function getElement(id, errorMessage) {
  const element = document.getElementById(id);
  if (!element && errorMessage) {
    console.error(errorMessage);
  }
  return element;
}

/**
* Create SVG element with attributes
*/
function createSVGElement(width, height, viewBox, pathData, fillColor) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('viewBox', viewBox);

  if (pathData) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', fillColor);
    path.setAttribute('d', pathData);
    svg.appendChild(path);
  }

  return svg;
}

/**
* Apply style object to element
*/
function applyStyles(element, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });
}

/**
* Convert style object to inline style string
*/
function styleObjectToString(styles) {
  return Object.entries(styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
}

// ============================================================================
// Hero Section Scroll Handler
// ============================================================================

function initHeroScrollHandler() {
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const heroSection = getElement('heroSection');
    if (!heroSection) return;

    const currentScroll = window.pageYOffset;

    if (currentScroll > CONFIG.SCROLL_THRESHOLD) {
      heroSection.style.opacity = '0';
      heroSection.style.maxHeight = '0';
      heroSection.style.overflow = 'hidden';
    } else {
      heroSection.style.opacity = '1';
      heroSection.style.maxHeight = CONFIG.HERO_MAX_HEIGHT;
      heroSection.style.overflow = 'visible';
    }

    lastScroll = currentScroll;
  });
}

// ============================================================================
// City Manager Class
// ============================================================================

class CityManager {
  constructor(mainCity = 'Boston, MA') {
    this.selectedCities = [mainCity];
    this.availableCities = CITY_DATA.AVAILABLE;
    this.cityToGeoId = CITY_DATA.GEO_IDS;
  }

  /**
  * Get geoId for a city
  */
  getGeoId(city) {
    return this.cityToGeoId[city] || null;
  }

  /**
  * Get all geoIds for selected cities
  */
  getSelectedGeoIds() {
    return this.selectedCities
      .map(city => this.getGeoId(city))
      .filter(geoId => geoId !== null);
  }

  /**
  * Get main city (first selected)
  */
  getMainCity() {
    return this.selectedCities[0];
  }

  /**
  * Get main city geoId
  */
  getMainGeoId() {
    return this.getGeoId(this.getMainCity());
  }

  /**
  * Check if city can be added
  */
  canAddCity() {
    return this.selectedCities.length < CONFIG.MAX_CITIES;
  }

  /**
  * Check if city can be removed
  */
  canRemoveCity() {
    return this.selectedCities.length > 1;
  }

  /**
  * Add a city
  */
  addCity(city) {
    if (this.canAddCity() && !this.selectedCities.includes(city)) {
      this.selectedCities.push(city);
      return true;
    }
    return false;
  }

  /**
  * Remove a city
  */
  removeCity(city) {
    if (this.canRemoveCity()) {
      this.selectedCities = this.selectedCities.filter(c => c !== city);
      return true;
    }
    return false;
  }

  /**
  * Update city at index
  */
  updateCity(index, newCity) {
    if (index >= 0 && index < this.selectedCities.length) {
      // Check if city is already selected elsewhere
      if (this.selectedCities.includes(newCity) && this.selectedCities[index] !== newCity) {
        return false;
      }
      this.selectedCities[index] = newCity;
      return true;
    }
    return false;
  }

  /**
  * Get available cities for a dropdown (excluding already selected ones)
  */
  getAvailableCitiesForDropdown(currentCity) {
    return this.availableCities.filter(city => {
      return city === currentCity || !this.selectedCities.includes(city);
    });
  }

  /**
  * Find next available city to add
  */
  findNextAvailableCity() {
    return this.availableCities.find(city => !this.selectedCities.includes(city));
  }
}

// ============================================================================
// Chart Renderer
// ============================================================================

class ChartRenderer {
  constructor(cityManager) {
    this.cityManager = cityManager;
  }

  /**
  * Create a line chart element for a single city showing trends over time
  */
  createLineChart(city, index) {
    const geoId = this.cityManager.getGeoId(city);
    if (!geoId) {
      console.error('GeoId not found for city:', city);
      return null;
    }

    // Get apiRoot for custom DC
    const apiRoot = typeof getApiRoot === 'function' ? getApiRoot() : window.location.origin;

    const lineChart = document.createElement('datacommons-line');
    lineChart.setAttribute('id', `line-chart-${index}`);
    lineChart.setAttribute('header', `Health Issue Distribution — ${city}`);
    lineChart.setAttribute('place', geoId);
    lineChart.setAttribute('variables', HEALTH_VARIABLES.LINE_CHART);
    lineChart.setAttribute('apiRoot', apiRoot);

    const lineStyle = {
      ...CONFIG.CHART_STYLE,
      height: CONFIG.CHART_HEIGHT_LINE
    };
    lineChart.setAttribute('style', styleObjectToString(lineStyle));

    return lineChart;
  }

  /**
  * Create a bar chart element comparing multiple cities
  */
  createBarChart() {
    const placesGeoIds = this.cityManager.getSelectedGeoIds();
    if (placesGeoIds.length === 0) {
      return null;
    }

    // Get apiRoot for custom DC
    const apiRoot = typeof getApiRoot === 'function' ? getApiRoot() : window.location.origin;

    const barChart = document.createElement('datacommons-bar');
    barChart.setAttribute('id', 'health-bar-chart');
    barChart.setAttribute('places', placesGeoIds.join(' '));
    barChart.setAttribute('variables', HEALTH_VARIABLES.BAR_CHART);
    barChart.setAttribute('header', 'Health Metrics Comparison');
    barChart.setAttribute('colors', HEALTH_VARIABLES.COLORS);
    barChart.setAttribute('apiRoot', apiRoot);

    const barStyle = {
      ...CONFIG.CHART_STYLE,
      height: CONFIG.CHART_HEIGHT_BAR,
      gridColumn: '1 / -1'
    };
    barChart.setAttribute('style', styleObjectToString(barStyle));

    return barChart;
  }

  /**
  * Render all charts (bar chart + line charts for each city)
  */
  renderCharts() {
    const container = getElement(WIDGET_IDS.CONTAINERS.CHARTS, 'charts-container element not found');
    if (!container) return;

    // Clear existing charts
    container.innerHTML = '';

    // Add bar chart first (comparison across cities)
    const barChart = this.createBarChart();
    if (barChart) {
      container.appendChild(barChart);
    }

    // Render line charts for each selected city (trends over time)
    this.cityManager.selectedCities.forEach((city, index) => {
      const lineChart = this.createLineChart(city, index);
      if (lineChart) {
        container.appendChild(lineChart);
      }
    });
  }
}

// ============================================================================
// Widget Updater
// ============================================================================

class WidgetUpdater {
  constructor(cityManager) {
    this.cityManager = cityManager;
  }

  /**
  * Update section title with current city
  */
  updateSectionTitle() {
    const titleElement = getElement(WIDGET_IDS.CONTAINERS.SECTION_TITLE);
    if (titleElement) {
      const mainCity = this.cityManager.getMainCity();
      titleElement.textContent = `Key Health Indicators — ${mainCity}`;
    }
  }

  /**
  * Update all highlight widgets with main city
  */
  updateHighlightWidgets() {
    const mainGeoId = this.cityManager.getMainGeoId();
    if (!mainGeoId) {
      console.error('Main city geoId not found');
      return;
    }

    // Get apiRoot for custom DC
    const apiRoot = typeof getApiRoot === 'function' ? getApiRoot() : window.location.origin;

    WIDGET_IDS.HIGHLIGHTS.forEach(id => {
      const widget = getElement(id);
      if (widget) {
        widget.setAttribute('place', mainGeoId);
        // Set apiroot for custom DC widgets (lowercase to match HTML attribute)
        if (widget.tagName === 'DATACOMMONS-HIGHLIGHT') {
          widget.setAttribute('apiroot', apiRoot);
        }
      }
    });
  }

  /**
  * Update all widgets
  */
  updateAll() {
    this.updateSectionTitle();
    this.updateHighlightWidgets();
  }
}

// ============================================================================
// City Select UI Renderer
// ============================================================================

class CitySelectRenderer {
  constructor(cityManager, onCityChange, onCityRemove, onCityAdd) {
    this.cityManager = cityManager;
    this.onCityChange = onCityChange;
    this.onCityRemove = onCityRemove;
    this.onCityAdd = onCityAdd;
  }

  /**
  * Create remove button for a city
  */
  createRemoveButton(city, isPrimary) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn';
    removeBtn.title = 'Remove city';
    removeBtn.onclick = () => this.onCityRemove(city);

    const svg = createSVGElement(
      '18',
      '18',
      '0 0 24 24',
      'M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11l4.89 4.89-4.89 4.89a1 1 0 1 0 1.41 1.41l4.89-4.89 4.89 4.89a1 1 0 0 0 1.41-1.41l-4.89-4.89 4.89-4.89a1 1 0 0 0 0-1.41z',
      isPrimary ? 'white' : '#757575'
    );

    removeBtn.appendChild(svg);
    return removeBtn;
  }

  /**
  * Create city select dropdown
  */
  createCitySelect(city, index) {
    const isPrimary = index === 0;
    const citySelectDiv = document.createElement('div');
    citySelectDiv.className = isPrimary ? 'city-select city-select-primary' : 'city-select';

    const select = document.createElement('select');
    const availableCities = this.cityManager.getAvailableCitiesForDropdown(city);

    availableCities.forEach(availableCity => {
      const option = document.createElement('option');
      option.value = availableCity;
      option.textContent = availableCity;
      if (availableCity === city) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Add change event listener
    select.addEventListener('change', (e) => {
      const newCity = e.target.value;
      if (!this.cityManager.updateCity(index, newCity)) {
        // City already selected elsewhere, reset
        select.value = city;
        return;
      }
      this.onCityChange();
    });

    citySelectDiv.appendChild(select);

    // Add remove button if more than one city
    if (this.cityManager.canRemoveCity()) {
      const removeBtn = this.createRemoveButton(city, isPrimary);
      citySelectDiv.appendChild(removeBtn);
    }

    return citySelectDiv;
  }

  /**
  * Create "Add City" button
  */
  createAddCityButton() {
    const addBtn = document.createElement('button');
    addBtn.className = 'add-city-btn';
    addBtn.onclick = () => this.onCityAdd();

    const svg = createSVGElement(
      '18',
      '18',
      '0 0 24 24',
      'M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z',
      '#1976D2'
    );

    addBtn.appendChild(svg);

    const span = document.createElement('span');
    span.textContent = 'Add City';
    addBtn.appendChild(span);

    return addBtn;
  }

  /**
  * Render all city selects
  */
  render() {
    const container = getElement(WIDGET_IDS.CONTAINERS.CITY_SELECT, 'city-select-row element not found');
    if (!container) return;

    container.innerHTML = '';

    // Render city selects
    this.cityManager.selectedCities.forEach((city, index) => {
      const citySelect = this.createCitySelect(city, index);
      container.appendChild(citySelect);
    });

    // Add "Add City" button if not at max
    if (this.cityManager.canAddCity()) {
      const addBtn = this.createAddCityButton();
      container.appendChild(addBtn);
    }
  }
}

// ============================================================================
// Main Application Controller
// ============================================================================

class HealthHomepageApp {
  constructor(mainCity = 'Boston, MA') {
    this.cityManager = new CityManager(mainCity);
    this.chartRenderer = new ChartRenderer(this.cityManager);
    this.widgetUpdater = new WidgetUpdater(this.cityManager);
    this.citySelectRenderer = new CitySelectRenderer(
      this.cityManager,
      () => this.onCityChange(),
      (city) => this.onCityRemove(city),
      () => this.onCityAdd()
    );
  }

  /**
  * Handle city change
  */
  onCityChange() {
    this.updateAll();
    this.citySelectRenderer.render();
  }

  /**
  * Handle city add
  */
  onCityAdd() {
    const nextCity = this.cityManager.findNextAvailableCity();
    if (nextCity && this.cityManager.addCity(nextCity)) {
      this.updateAll();
      this.citySelectRenderer.render();
    }
  }

  /**
  * Handle city remove
  */
  onCityRemove(city) {
    if (this.cityManager.removeCity(city)) {
      this.updateAll();
      this.citySelectRenderer.render();
    }
  }

  /**
  * Update all widgets and charts
  */
  updateAll() {
    this.chartRenderer.renderCharts();
    this.widgetUpdater.updateAll();
    this.updateMetricsTitle();
  }

  /**
  * Update the Key Metrics Indicators title with current city
  */
  updateMetricsTitle() {
    const titleElement = document.getElementById('key-metrics-indicators-title');
    if (titleElement) {
      const mainCity = this.cityManager.getMainCity();
      titleElement.textContent = `Key Metrics Indicators - ${mainCity}`;
    }
  }

  /**
  * Initialize the application
  */
  init() {
    this.citySelectRenderer.render();
    this.updateAll();
  }
}

// ============================================================================
// Latest Date from Highlight Widgets
// ============================================================================

/**
* Simple CSV parser that handles quoted values
* @param {string} line - CSV line to parse
* @returns {Array<string>} Array of parsed values
*/
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim()); // Add the last value
  
  return values;
}

/**
* Gets the latest date (max year) from the uploaded CSV file for a specific place and variable
*
* @param {string} place - The place DCID
* @param {string} variable - The variable DCID
* @param {string} apiRoot - The API root URL (for custom DC)
* @returns {Promise<number|null>} The maximum year found, or null if not found
*/
async function getLatestDateFromCSV(place, variable, apiRoot) {
  try {
    if (!place || !variable || !apiRoot) {
      return null;
    }

    // List of custom variables that should be in the CSV
    const customVariables = [
      'Percent_Person_WithHealthyVitaminD',
      'Percent_Person_Vaccinated',
      'Percent_Person_Sick'
    ];

    // Only try CSV for custom variables
    if (!customVariables.includes(variable)) {
      return null;
    }

    // Try multiple possible CSV file locations
    const possiblePaths = [
      `${apiRoot}/custom_dc/health/data/health_dashboard.csv`,
      `${apiRoot}/static/custom_dc/health/data/health_dashboard.csv`,
      `${apiRoot}/config/custom_dc/health/health_dashboard.csv`,
      `${apiRoot}/admin/api/download/health_dashboard.csv`,
      `${apiRoot}/admin/api/csv/health_dashboard.csv`
    ];

    let csvText = null;

    // Try each path until one works
    for (const csvUrl of possiblePaths) {
      try {
        const response = await fetch(csvUrl, { 
          method: 'GET',
          headers: { 'Accept': 'text/csv' }
        });
        if (response.ok) {
          csvText = await response.text();
          console.debug(`Successfully loaded CSV from ${csvUrl}`);
          break;
        }
      } catch (e) {
        // Continue to next path
        console.debug(`Failed to load CSV from ${csvUrl}:`, e);
        continue;
      }
    }

    if (!csvText) {
      // If CSV file is not accessible from any path, return null to fall back to API
      console.debug(`CSV not accessible for ${variable}, will try API`);
      return null;
    }
    
    // Parse CSV (handle quoted values)
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      console.debug(`CSV has no data rows for ${variable}`);
      return null; // No data rows
    }

    // Parse header to find column indices
    const headers = parseCSVLine(lines[0]);
    const dcidIndex = headers.indexOf('dcid');
    const yearIndex = headers.indexOf('year');
    const variableIndex = headers.indexOf(variable);

    if (dcidIndex === -1 || yearIndex === -1 || variableIndex === -1) {
      console.debug(`CSV missing required columns for ${variable}: dcid=${dcidIndex}, year=${yearIndex}, variable=${variableIndex}`);
      return null; // Required columns not found
    }

    // Find all years for the specific place and variable (where value is not empty)
    const years = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length > Math.max(dcidIndex, yearIndex, variableIndex)) {
        const rowPlace = values[dcidIndex];
        const rowYear = values[yearIndex];
        const rowValue = values[variableIndex];

        // Check if this row matches our place and has a value
        if (rowPlace === place && rowValue && rowValue !== '' && !isNaN(parseFloat(rowValue))) {
          const year = parseInt(rowYear, 10);
          if (!isNaN(year)) {
            years.push(year);
          }
        }
      }
    }

    if (years.length === 0) {
      console.debug(`No years found in CSV for ${variable} in ${place}`);
      return null;
    }

    // Return the maximum year
    const maxYear = Math.max(...years);
    console.debug(`Found max year ${maxYear} from CSV for ${variable} in ${place}`);
    return maxYear;

  } catch (error) {
    // If CSV parsing fails, return null to fall back to API
    console.debug(`Could not get date from CSV for ${place}, ${variable}:`, error);
    return null;
  }
}

/**
* Gets the latest date (max year) for a specific place and variable
* by querying the Data Commons API (either official or custom DC) or CSV file
*
* @param {string} place - The place DCID
* @param {string} variable - The variable DCID
* @param {string} apiRoot - The API root URL (for custom DC) or null for official DC
* @returns {Promise<number|null>} The maximum year found, or null if not found
*/
async function getLatestDateForWidget(place, variable, apiRoot = null) {
  try {
    if (!place || !variable) {
      return null;
    }

    // For custom variables with apiRoot, first try to get date from CSV file
    if (apiRoot) {
      const csvYear = await getLatestDateFromCSV(place, variable, apiRoot);
      if (csvYear !== null) {
        console.debug(`Found date from CSV for ${variable} in ${place}: ${csvYear}`);
        return csvYear;
      }
    }

    // Fall back to API query
    // Determine which API to use
    // Use custom DC API if apiRoot is provided, otherwise use official Data Commons API
    const baseUrl = apiRoot || 'https://api.datacommons.org';
    
    // Try stat/series endpoint first
    let url = new URL(`${baseUrl}/stat/series`);
    url.searchParams.append('place', place);
    url.searchParams.append('stat_var', variable);

    let response = await fetch(url.toString());
    let data = null;

    if (response.ok) {
      data = await response.json();
    } else {
      // If stat/series fails, try stat/point endpoint as fallback
      url = new URL(`${baseUrl}/stat/point`);
      url.searchParams.append('place', place);
      url.searchParams.append('stat_var', variable);
      
      response = await fetch(url.toString());
      if (response.ok) {
        data = await response.json();
      }
    }

    if (!response.ok || !data) {
      console.debug(`API request failed for ${variable} in ${place}: ${response.status}`);
      return null;
    }

    // The API returns data in different formats, handle all cases
    let dates = [];

    // Format 1: { series: { "YYYY-MM-DD": value, ... } }
    if (data.series) {
      dates = Object.keys(data.series);
    }
    // Format 2: { [place]: { [variable]: { series: { "YYYY-MM-DD": value, ... } } } }
    else if (data[place] && data[place][variable] && data[place][variable].series) {
      dates = Object.keys(data[place][variable].series);
    }
    // Format 3: { [place]: { [variable]: { "YYYY": value, ... } } }
    else if (data[place] && data[place][variable]) {
      dates = Object.keys(data[place][variable]).filter(key => /^\d{4}/.test(key));
    }
    // Format 4: { data: { [place]: { [variable]: { series: { ... } } } } }
    else if (data.data && data.data[place] && data.data[place][variable] && data.data[place][variable].series) {
      dates = Object.keys(data.data[place][variable].series);
    }
    // Format 5: Try to find any date-like keys in the root
    else if (typeof data === 'object') {
      dates = Object.keys(data).filter(key => /^\d{4}/.test(key));
    }

    if (dates.length === 0) {
      console.debug(`No dates found in API response for ${variable} in ${place}`, data);
      return null;
    }

    // Extract years from dates (handle both YYYY-MM-DD and YYYY formats)
    const years = dates.map(date => {
      // If date is in YYYY-MM-DD format, extract year
      if (date.includes('-')) {
        return parseInt(date.split('-')[0], 10);
      }
      // If it's just a year
      return parseInt(date, 10);
    }).filter(year => !isNaN(year));

    if (years.length === 0) {
      return null;
    }

    // Return the maximum year
    const maxYear = Math.max(...years);
    console.debug(`Found date from API for ${variable} in ${place}: ${maxYear}`);
    return maxYear;

  } catch (error) {
    console.error(`Error fetching data for place: ${place}, variable: ${variable}`, error);
    return null;
  }
}

/**
* Updates all label elements associated with datacommons-highlight widgets
* with the latest year from the API for each individual widget
*/
async function updateMetricsUpdatedDate() {
  try {
    // Wait a bit for widgets to be fully initialized and apiRoot to be set
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get all datacommons-highlight widgets
    const highlightWidgets = document.querySelectorAll('datacommons-highlight');

    if (highlightWidgets.length === 0) {
      console.warn('No datacommons-highlight widgets found');
      return;
    }

    // Get apiRoot for custom DC (default to window.location.origin if getApiRoot is not available)
    const defaultApiRoot = typeof getApiRoot === 'function' ? getApiRoot() : window.location.origin;

    // List of custom variables that need custom DC API
    const customVariables = [
      'Percent_Person_WithHealthyVitaminD',
      'Percent_Person_Vaccinated',
      'Percent_Person_Sick'
    ];

    // Ensure all custom variable widgets have apiRoot set
    highlightWidgets.forEach(widget => {
      const variable = widget.getAttribute('variable');
      if (customVariables.includes(variable)) {
        const currentApiRoot = widget.getAttribute('apiRoot') || widget.getAttribute('apiroot');
        if (!currentApiRoot) {
          widget.setAttribute('apiRoot', defaultApiRoot);
          console.debug(`Set apiRoot for widget ${widget.id} to ${defaultApiRoot}`);
        }
      }
    });

    console.log(`Found ${highlightWidgets.length} widgets to update dates for`);

    // Process each widget individually
    const updatePromises = Array.from(highlightWidgets).map(async (widget) => {
      const place = widget.getAttribute('place');
      const variable = widget.getAttribute('variable');

      if (!place || !variable) {
        console.debug(`Widget missing place or variable:`, widget.id);
        return;
      }

      // Determine which API to use based on variable type
      // If it's a custom variable, use the widget's apiRoot or default custom DC API
      // Otherwise, use official Data Commons API
      const isCustomVariable = customVariables.includes(variable);
      const widgetApiRoot = widget.getAttribute('apiRoot') || widget.getAttribute('apiroot');
      const apiRoot = isCustomVariable ? (widgetApiRoot || defaultApiRoot) : null;

      console.debug(`Updating date for widget ${widget.id}: variable=${variable}, place=${place}, apiRoot=${apiRoot}, isCustom=${isCustomVariable}`);

      // Get the latest date for this specific widget
      let maxYear = await getLatestDateForWidget(place, variable, apiRoot);

      // If no date found for custom variables, use fallback (2024 is the latest year in CSV)
      if (maxYear === null && isCustomVariable) {
        console.debug(`No date found for custom variable ${variable}, using fallback year 2024`);
        maxYear = 2024;
      }

      if (maxYear === null) {
        console.debug(`No date found for widget ${widget.id} (${variable} in ${place})`);
        return;
      }

      console.debug(`Updating date for widget ${widget.id} to ${maxYear}`);

      // For metric cards, find the metric-label element
      const metricCard = widget.closest('.metric-card');
      if (metricCard) {
        const metricLabel = metricCard.querySelector('.metric-label');
        if (metricLabel) {
          let currentText = metricLabel.textContent.trim();
          // Remove any existing year (with or without parentheses) to avoid duplicates
          // Match patterns like (2025), 2025, or year at the end
          currentText = currentText.replace(/\s*\(\d{4}\)\s*$/, '').replace(/\s+\d{4}\s*$/, '').trim();

          // If text exists after removing year, append date in parentheses, otherwise just set the date
          if (currentText) {
            metricLabel.textContent = currentText + ' (' + maxYear + ')';
          } else {
            metricLabel.textContent = maxYear.toString();
          }
        }
      }

      // For key indicators, find the key-indicator-date element
      // The structure is: .key-indicator-item > .key-indicator-header > .key-indicator-date
      // And the widget is in: .key-indicator-item > .key-indicator-value > datacommons-highlight
      
      let keyIndicatorDate = null;
      
      // Method 1: Use closest to find parent, then querySelector
      const keyIndicatorItem = widget.closest('.key-indicator-item');
      if (keyIndicatorItem) {
        keyIndicatorDate = keyIndicatorItem.querySelector('.key-indicator-date');
      }
      
      // Method 2: If that didn't work, try finding by widget ID and traversing
      if (!keyIndicatorDate && widget.id) {
        const widgetElement = document.getElementById(widget.id);
        if (widgetElement) {
          let parent = widgetElement.parentElement;
          let depth = 0;
          while (parent && depth < 5) {
            if (parent.classList && parent.classList.contains('key-indicator-item')) {
              keyIndicatorDate = parent.querySelector('.key-indicator-date');
              if (keyIndicatorDate) break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }
      }
      
      // Method 3: Direct search for date element near the widget
      if (!keyIndicatorDate) {
        // Find all key-indicator-date elements and match by position
        const allDateElements = document.querySelectorAll('.key-indicator-date');
        const allWidgets = document.querySelectorAll('datacommons-highlight');
        const widgetIndex = Array.from(allWidgets).indexOf(widget);
        if (widgetIndex >= 0 && widgetIndex < allDateElements.length) {
          keyIndicatorDate = allDateElements[widgetIndex];
        }
      }

      if (keyIndicatorDate) {
        // For key-indicator-date, always set just the year without parentheses
        keyIndicatorDate.textContent = maxYear.toString();
        console.debug(`✓ Updated key-indicator-date for widget ${widget.id} (${variable}) to ${maxYear}`);
      } else {
        console.warn(`✗ Could not find .key-indicator-date for widget ${widget.id} (${variable}). Tried multiple methods.`);
        console.warn(`  Widget parent:`, widget.parentElement?.className);
        console.warn(`  Widget structure:`, widget.parentElement?.parentElement?.className);
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

  } catch (error) {
    console.error('Error updating metricsUpdated date:', error);
  }
}

// ============================================================================
// Initialization
// ============================================================================

// Initialize hero scroll handler
initHeroScrollHandler();

// Initialize city management app with domain config
let app;

function initializeApp(domainInfo) {
  // Use mainCity from dashboard config, fallback to 'Boston, MA'
  const mainCity = domainInfo?.mainCity || 'Boston, MA';

  // Create app with the main city from domain config
  app = new HealthHomepageApp(mainCity);

  // Expose handlers for global access (needed for onclick handlers)
  window.handleAddCity = () => app.onCityAdd();
  window.handleRemoveCity = (city) => app.onCityRemove(city);

  // Initialize the app
  app.init();

  // Update metrics updated date with latest year from API
  updateMetricsUpdatedDate();
}

// Fetch domain config and initialize app
fetchData((domainInfo) => {
  initializeApp(domainInfo);
});

// Initialize when DOM is ready (fallback)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!app) {
      // If fetchData hasn't completed yet, wait a bit more
      setTimeout(() => {
        if (!app) initializeApp({});
      }, 100);
    }
  });
}
