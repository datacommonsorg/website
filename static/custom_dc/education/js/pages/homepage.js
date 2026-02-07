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

import { getApiRoot } from '../utils/api.js';

// Hero Section - Hide on scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const heroSection = document.getElementById('heroSection');
  const currentScroll = window.pageYOffset;

  if (currentScroll > 100) {
    heroSection.style.opacity = '0';
    heroSection.style.maxHeight = '0';
    heroSection.style.overflow = 'hidden';
  } else {
    heroSection.style.opacity = '1';
    heroSection.style.maxHeight = '31.25rem';
    heroSection.style.overflow = 'visible';
  }

  lastScroll = currentScroll;
});

// Data Commons widget label mapping
const dcLabelMap = {
  totalApplicantsLabel: 'Total Applicants',
  avgOpportunityScoreLabel: 'Avg Opportunity Score',
  avgApplicationsPerRegionLabel: 'Avg Applications per Region',
  avgHouseHoldIncomeLabel: 'Avg Household Income',
  acceptedEnrollmentsByYearLabel: 'Accepted Enrollments',
  highOpportunityRegionsLabel: 'High-Opportunity Regions',
  regionsWithDecliningInterestLabel: 'Regions with Declining Interest',
};

const apiRoot = getApiRoot();

// Apply apiRoot to every DC widget (important for custom DC)
const dcWidgets = [
  "totalApplicants", "avgOpportunityScore", "avgApplicationsPerRegion",
  "avgHouseHoldIncome", "dc-ranking",
  "acceptedEnrollmentsByYear", "highOpportunityRegions",
  "regionsWithDecliningInterest",
  "dc-map",
].map((id) => document.getElementById(id));

dcWidgets.forEach((el) => {
  // Data Commons web components support apiRoot as an advanced configuration attribute.
  el.setAttribute("apiRoot", apiRoot);
});

/**
 * Update the year for all widgets and labels
 */
function setYear(year) {
  // Update the date attribute on all widgets
  dcWidgets.forEach((el) => el.setAttribute("date", year));

  Object.entries(dcLabelMap).forEach(([elId, defaultLabel]) => {
    document.getElementById(elId).textContent = defaultLabel + ` (${year})`;
  });

  document.getElementById('dc-map').setAttribute('header', `Recruitment Potential by State (${year})`);
}

// Year filter event listener
document.getElementById("targetYear").addEventListener("change", (e) => {
  setYear(e.target.value);
});

// Mapping of long variable names to short display names for ranking widget
const variableNameMap = {
  'Recruitment_Insights_Applicants': 'Applicants',
  'Recruitment_Insights_Opportunity_Score': 'Score',
  'Recruitment_Insights_Household_Income': 'Income',
};

/**
 * Replace long variable names with short ones in the ranking widget
 */
function updateRankingColumnNames() {
  const rankingWidget = document.getElementById('dc-ranking');
  if (!rankingWidget) return;

  // Try shadowRoot first (LitElement uses open shadow DOM by default)
  const root = rankingWidget.shadowRoot;
  if (!root) return;

  // Target the stat cells in thead which contain the variable names
  const headerCells = root.querySelectorAll('thead td.stat, th.stat');
  headerCells.forEach((cell) => {
    const text = cell.textContent.trim();
    if (variableNameMap[text]) {
      cell.textContent = variableNameMap[text];
    }
  });

  // Also look for any cells containing the variable names as text
  const allCells = root.querySelectorAll('td, th, span, div');
  allCells.forEach((cell) => {
    // Only modify if this is a direct text node (not nested elements)
    if (cell.children.length === 0) {
      const text = cell.textContent.trim();
      if (variableNameMap[text]) {
        cell.textContent = variableNameMap[text];
      }
    }
  });
}

/**
 * Set up observer to watch for ranking widget changes
 */
function observeRankingWidget() {
  const rankingWidget = document.getElementById('dc-ranking');
  if (!rankingWidget) return;

  const root = rankingWidget.shadowRoot;
  if (!root) return;

  // Create observer for the shadow DOM
  const observer = new MutationObserver(() => {
    // Debounce updates
    clearTimeout(window.rankingUpdateTimeout);
    window.rankingUpdateTimeout = setTimeout(updateRankingColumnNames, 50);
  });

  // Observe the shadow root
  const config = { childList: true, subtree: true, characterData: true };
  observer.observe(root, config);
}

// Initialize with default year
$(document).ready(function () {
  setYear('2025');

  // Poll for ranking widget render and update column names
  let attempts = 0;
  const maxAttempts = 30;
  const checkInterval = setInterval(() => {
    attempts++;
    updateRankingColumnNames();
    
    // Set up observer once widget is found
    const rankingWidget = document.getElementById('dc-ranking');
    if (rankingWidget && (rankingWidget.shadowRoot || rankingWidget.querySelector('*'))) {
      observeRankingWidget();
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
    }
  }, 300);
});
