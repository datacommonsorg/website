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
 * Get the API root URL from query params or default to current origin
 */
export function getApiRoot() {
  const params = new URLSearchParams(location.search);
  return params.get("apiRoot") || location.origin || "https://datacommons.org";
}

/**
 * Fetch domain configuration data
 * @param {Function} callback - Callback function to execute with domain info
 */
export async function fetchData(callback) {
  const apiRoot = getApiRoot();

  let domainInfo = {};

  try {
    const response = await fetch(apiRoot + "/admin/api/domain-config");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    domainInfo = await response.json();

    callback(domainInfo);
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Render domain info (logo and name)
 * @param {Object} domainInfo - Domain configuration object
 * @param {Object} options - Rendering options
 * @param {string} options.logoSelector - CSS selector for logo container
 * @param {string} options.nameSelector - CSS selector for domain name element
 * @param {string} options.faviconSelector - CSS selector for favicon element
 * @param {string} options.logoUrl - URL template for logo (supports Jinja2 template syntax)
 */
export function renderDomainInfo(domainInfo, options = {}) {
  const {
    logoSelector = '#logoPlaceholder',
    nameSelector = '#domainName',
    faviconSelector = '#faviconLogo',
    logoUrl = ''
  } = options;

  // Update domain name
  const nameElement = document.querySelector(nameSelector);
  if (nameElement && domainInfo.domainName) {
    nameElement.textContent = domainInfo.domainName;
  }

  // Update logo
  const logoElement = document.querySelector(logoSelector);
  if (logoElement && domainInfo.logoPresent === "true" && logoUrl) {
    logoElement.innerHTML = `<img id="domainLogoImg" class="domain-logo-image" src="${logoUrl}" alt="${domainInfo.domainName || 'Domain'} logo" />`;
    
    // Update favicon
    const faviconElement = document.querySelector(faviconSelector);
    if (faviconElement) {
      faviconElement.href = logoUrl;
    }
  } else if (logoElement) {
    logoElement.innerHTML = '<md-icon id="logoPlaceholderMd" class="logo-icon">check_box_outline_blank</md-icon>';
  }

  // Update contact email if present
  const contactEmailElement = document.querySelector('#contactEmail');
  if (contactEmailElement && domainInfo.contactEmail) {
    contactEmailElement.textContent = domainInfo.contactEmail;
  }
}

// Set global apiRoot for backward compatibility
if (typeof window !== 'undefined' && typeof window.apiRoot === 'undefined') {
  window.apiRoot = getApiRoot();
}
