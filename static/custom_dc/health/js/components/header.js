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

import { fetchData, renderDomainInfo } from '../utils/api.js';

/**
 * Initialize header functionality
 * @param {Object} options - Configuration options
 * @param {string} options.logoUrl - URL for domain logo
 */
export function initializeHeader(options = {}) {
  const { logoUrl = '' } = options;

  // Fetch and render domain info
  fetchData((domainInfo) => {
    renderDomainInfo(domainInfo, {
      logoSelector: '#logoPlaceholder',
      nameSelector: '#domainName',
      faviconSelector: '#faviconLogo',
      logoUrl: logoUrl
    });
  });

  // Initialize search functionality
  initializeSearch();

  // Initialize mega menu dropdowns
  initializeMegaMenus();

  // Initialize logo navigation
  initializeLogoNavigation();
}

/**
 * Initialize search input and arrow handlers
 */
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchArrow = document.getElementById('searchArrow');

  if (!searchInput || !searchArrow) return;

  // Update arrow color based on input content
  searchInput.addEventListener('input', updateArrowState);
  
  // Handle arrow click
  searchArrow.addEventListener('click', handleSearch);

  // Handle Enter key press
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  function updateArrowState() {
    const query = searchInput.value.trim();
    if (query) {
      searchArrow.classList.add('active');
    } else {
      searchArrow.classList.remove('active');
    }
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
      // Redirect to results page with query parameter
      window.location.href = `/explore?q=${encodeURIComponent(query)}`;
    }
  }

  // Initialize arrow state on page load
  updateArrowState();
}

/**
 * Initialize mega menu dropdown handling (click-based)
 */
function initializeMegaMenus() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  let activeDropdown = null;

  dropdowns.forEach(dropdown => {
    const btn = dropdown.querySelector('.nav-btn');
    if (!btn) return;

    // Click on button to toggle dropdown
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.classList.contains('open')) {
        closeDropdown(dropdown);
      } else {
        closeAllDropdowns();
        openDropdown(dropdown);
      }
    });

    // Keyboard navigation
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (dropdown.classList.contains('open')) {
          closeDropdown(dropdown);
        } else {
          closeAllDropdowns();
          openDropdown(dropdown);
        }
      } else if (e.key === 'Escape') {
        closeDropdown(dropdown);
      }
    });
  });

  function openDropdown(dropdown) {
    dropdown.classList.add('open');
    const btn = dropdown.querySelector('.nav-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    activeDropdown = dropdown;
  }

  function closeDropdown(dropdown) {
    dropdown.classList.remove('open');
    const btn = dropdown.querySelector('.nav-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (activeDropdown === dropdown) {
      activeDropdown = null;
    }
  }

  function closeAllDropdowns() {
    dropdowns.forEach(d => closeDropdown(d));
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      closeAllDropdowns();
    }
  });
}

/**
 * Initialize logo navigation click handler
 */
function initializeLogoNavigation() {
  const logoSection = document.querySelector('.logo-section');
  if (!logoSection) return;

  logoSection.addEventListener('click', () => {
    const url = logoSection.dataset.href;
    if (url) {
      window.location.href = url;
    }
  });
}
