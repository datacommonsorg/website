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

import { fetchData, getApiRoot } from '../utils/api.js';

/**
 * Initialize login page functionality
 * @param {Object} options - Configuration options
 * @param {string} options.logoUrl - URL for domain logo
 * @param {string} options.dashboardUrl - URL for admin dashboard redirect
 */
export function initializeLogin(options = {}) {
  const { logoUrl = '', dashboardUrl = '/admin/dashboard' } = options;

  // Fetch and render domain info
  fetchData((domainInfo) => {
    renderLoginDomainInfo(domainInfo, logoUrl);
  });

  // Setup login form handler
  setupLoginForm(dashboardUrl);
}

/**
 * Renders domain information on the login page
 * @param {Object} domainInfo - Domain configuration object
 * @param {string} logoUrl - URL for the domain logo
 */
function renderLoginDomainInfo(domainInfo, logoUrl) {
  const domainNameEl = document.getElementById('domainName');
  const descriptionTitleEl = document.getElementById('descriptionTitle');
  const contactEmailEl = document.getElementById('contactEmail');

  if (domainNameEl && domainInfo.domainName) {
    domainNameEl.textContent = domainInfo.domainName;
  }

  if (descriptionTitleEl && domainInfo.descriptionTitle) {
    descriptionTitleEl.textContent = domainInfo.descriptionTitle;
  }

  if (contactEmailEl && domainInfo.contactEmail) {
    contactEmailEl.textContent = domainInfo.contactEmail;
  }

  // Update logo if present
  if (domainInfo.logoPresent === "true" && logoUrl) {
    const domainLogoEl = document.getElementById('domainLogo');
    const domainLogoImgEl = document.getElementById('domainLogoImg');
    const faviconLogoEl = document.getElementById('faviconLogo');

    if (domainLogoEl) {
      domainLogoEl.classList.add('hidden');
    }

    if (domainLogoImgEl) {
      domainLogoImgEl.classList.remove('hidden');
    }

    if (faviconLogoEl) {
      faviconLogoEl.setAttribute('href', logoUrl);
    }
  }
}

/**
 * Setup login form submission handler
 * @param {string} dashboardUrl - URL to redirect to after successful login
 */
function setupLoginForm(dashboardUrl) {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(dashboardUrl);
  });
}

/**
 * Handle login form submission
 * @param {string} dashboardUrl - URL to redirect to after successful login
 */
async function handleLogin(dashboardUrl) {
  const apiRoot = getApiRoot();
  const formData = new FormData();

  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');

  if (!usernameEl || !passwordEl) {
    console.error('Username or password field not found');
    return;
  }

  formData.append('username', usernameEl.value);
  formData.append('password', passwordEl.value);

  try {
    const response = await fetch(`${apiRoot}/admin/api/login`, {
      method: 'POST',
      body: formData,
    });

    const jsonData = await response.json();

    if (response.status !== 200) {
      showLoginError(jsonData.message);
    } else {
      window.location.href = dashboardUrl;
    }
  } catch (error) {
    console.error('Login error:', error);
    showLoginError('An error occurred during login. Please try again.');
  }
}

/**
 * Display login error message
 * @param {string} message - Error message to display
 */
function showLoginError(message) {
  const loginAlertsEl = document.getElementById('loginAlerts');
  const errorMessageEl = document.getElementById('errorMessage');

  if (loginAlertsEl) {
    loginAlertsEl.classList.remove('hidden');
  }
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
}
