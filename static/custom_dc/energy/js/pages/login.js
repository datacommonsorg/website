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

import { getApiRoot, fetchData } from '../utils/api.js';

/**
 * Render domain information for login page
 * @param {Object} domainInfo - Domain configuration object
 */
function render(domainInfo) {
  // Update domain name
  const domainNameEl = document.getElementById('domainName');
  if (domainNameEl && domainInfo.domainName) {
    domainNameEl.textContent = domainInfo.domainName;
  }
  
  // Update description title
  const descriptionTitleEl = document.getElementById('descriptionTitle');
  if (descriptionTitleEl && domainInfo.descriptionTitle) {
    descriptionTitleEl.textContent = domainInfo.descriptionTitle;
  }
  
  // Update contact email
  const contactEmailEl = document.getElementById('contactEmail');
  if (contactEmailEl && domainInfo.contactEmail) {
    contactEmailEl.textContent = domainInfo.contactEmail;
  }

  // Handle logo display
  const domainLogoEl = document.getElementById('domainLogo');
  const domainLogoImgEl = document.getElementById('domainLogoImg');
  const faviconEl = document.getElementById('faviconLogo');

  if (domainInfo.logoPresent === "true") {
    // Hide the icon, show the image
    if (domainLogoEl) {
      domainLogoEl.classList.add('hidden');
    }
    if (domainLogoImgEl) {
      domainLogoImgEl.classList.remove('hidden');
    }
    // Update favicon
    if (faviconEl && domainLogoImgEl && domainLogoImgEl.src) {
      faviconEl.href = domainLogoImgEl.src;
    }
  } else {
    // Show the icon, hide the image
    if (domainLogoEl) {
      domainLogoEl.classList.remove('hidden');
    }
    if (domainLogoImgEl) {
      domainLogoImgEl.classList.add('hidden');
    }
  }
}

/**
 * Initialize login page
 */
function init() {
  // Fetch domain data and render
  fetchData(render);
  
  // Set up form submit handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      loginAction();
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Handle login form submission
 */
async function loginAction() {
  const apiRoot = getApiRoot();
  const formData = new FormData();

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  if (!usernameInput || !passwordInput) {
    showLoginError('Form fields not found');
    return;
  }

  formData.append('username', usernameInput.value);
  formData.append('password', passwordInput.value);

  try {
    const response = await fetch(`${apiRoot}/admin/api/login`, {
      method: 'POST',
      body: formData,
    });

    const jsonData = await response.json();

    if (response.status !== 200) {
      showLoginError(jsonData.message || 'Login failed');
    } else {
      window.location.href = "/admin/dashboard";
    }
  } catch (error) {
    console.error('Login error:', error);
    showLoginError('An error occurred during login');
  }
}

/**
 * Display login error message
 */
function showLoginError(message) {
  const loginAlerts = document.getElementById('loginAlerts');
  const errorMessage = document.getElementById('errorMessage');
  
  if (loginAlerts && errorMessage) {
    errorMessage.textContent = message;
    loginAlerts.classList.remove('hidden');
  }
}

