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
import { showMsgAlert } from '../components/alert.js';

// Selected files state
const selectedFiles = {
  applicant: null,
  logo: null
};

/**
 * Initialize dashboard functionality
 */
export function initializeDashboard() {
  // Fetch and render domain configuration
  fetchData(renderDashboardConfig);
  
  // Set up form validation
  setupFormValidation();

  // Make functions globally available for onclick handlers
  window.switchTab = switchTab;
  window.saveChanges = saveChanges;
  window.handleFileSelect = handleFileSelect;
  window.removeFile = removeFile;
  window.uploadApplicantFile = uploadApplicantFile;
  window.logout = logout;
}

/**
 * Tab switching functionality
 */
function switchTab(event, tabName) {
  event.preventDefault();

  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Remove active class from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected tab content
  const tabContent = document.getElementById(tabName + '-tab');
  if (tabContent) tabContent.classList.add('active');

  // Add active class to clicked tab
  event.currentTarget.classList.add('active');
}

/**
 * Render domain configuration data into form fields
 */
function renderDashboardConfig(domainInfo) {
  const domainNameEl = document.getElementById('domainName');
  const logoPresentEl = document.getElementById('logoPresent');
  const contactEmailEl = document.getElementById('contactEmail');

  if (domainNameEl) domainNameEl.value = domainInfo.domainName || '';
  if (logoPresentEl) logoPresentEl.setAttribute('value', domainInfo.logoPresent || 'false');
  if (contactEmailEl) contactEmailEl.value = domainInfo.contactEmail || '';

  // Show current logo if exists
  if (domainInfo.logoPresent === "true") {
    const selectedLogoNameEl = document.getElementById('selectedLogoName');
    const selectedLogoDisplayEl = document.getElementById('selectedLogoDisplay');
    if (selectedLogoNameEl) selectedLogoNameEl.textContent = 'logo.png';
    if (selectedLogoDisplayEl) {
      selectedLogoDisplayEl.classList.remove('hidden');
      selectedLogoDisplayEl.classList.add('show');
    }

    // Update favicon
    const faviconEl = document.getElementById('faviconLogo');
    const faviconUrl = faviconEl?.dataset.logoUrl;
    if (faviconEl && faviconUrl) {
      faviconEl.href = faviconUrl;
    }
  }
}

/**
 * Save changes to domain configuration
 */
function saveChanges() {
  if (!validateAllFields()) {
    showMsgAlert('error', 'Please fill in all required fields correctly.');
    return;
  }
  saveChangesRequest();
}

/**
 * Send save changes request to API
 */
async function saveChangesRequest() {
  const apiRoot = getApiRoot();
  const formData = new FormData();

  if (selectedFiles.logo) {
    formData.append('file', selectedFiles.logo);
    document.getElementById('logoPresent').setAttribute('value', "true");
  }
  
  formData.append('domainName', document.getElementById('domainName').value);
  formData.append('logoPresent', document.getElementById('logoPresent').value);
  formData.append('contactEmail', document.getElementById('contactEmail').value);

  try {
    const response = await fetch(`${apiRoot}/admin/api/update-config`, {
      method: 'POST',
      body: formData,
    });

    const jsonData = await response.json();

    if (response.status === 200) {
      showMsgAlert('success', jsonData.message);
    } else {
      showMsgAlert('error', 'Domain config were not saved!');
    }
  } catch (error) {
    console.error('Save error:', error);
    showMsgAlert('error', 'An error occurred while saving');
  }
}

/**
 * Validation helpers
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function showFieldError(fieldId, errorId, showError) {
  const errorEl = document.getElementById(errorId);
  const fieldEl = document.getElementById(fieldId);
  if (!errorEl || !fieldEl) return;
  
  if (showError) {
    errorEl.classList.remove('hidden');
    fieldEl.style.setProperty('--md-outlined-text-field-outline-color', '#EA4335');
    fieldEl.style.setProperty('--md-outlined-text-field-focus-outline-color', '#EA4335');
  } else {
    errorEl.classList.add('hidden');
    fieldEl.style.setProperty('--md-outlined-text-field-outline-color', '#DADCE0');
    fieldEl.style.setProperty('--md-outlined-text-field-focus-outline-color', '#1A73E8');
  }
}

function validateAllFields() {
  let isValid = true;
  
  // Validate Domain Name
  const domainNameEl = document.getElementById('domainName');
  if (!domainNameEl || !domainNameEl.value || domainNameEl.value.trim() === '') {
    showFieldError('domainName', 'domainNameError', true);
    isValid = false;
  } else {
    showFieldError('domainName', 'domainNameError', false);
  }
  
  // Validate Contact Email
  const contactEmailEl = document.getElementById('contactEmail');
  if (!contactEmailEl || !contactEmailEl.value || !isValidEmail(contactEmailEl.value)) {
    showFieldError('contactEmail', 'contactEmailError', true);
    isValid = false;
  } else {
    showFieldError('contactEmail', 'contactEmailError', false);
  }
  
  return isValid;
}

function setupFormValidation() {
  const interactions = {
    domainName: false,
    contactEmail: false
  };
  
  // Domain Name validation
  const domainNameEl = document.getElementById('domainName');
  if (domainNameEl) {
    domainNameEl.addEventListener('input', function() {
      interactions.domainName = true;
      if (!this.value || this.value.trim() === '') {
        showFieldError('domainName', 'domainNameError', true);
      } else {
        showFieldError('domainName', 'domainNameError', false);
      }
    });
  }
  
  // Contact Email validation
  const contactEmailEl = document.getElementById('contactEmail');
  if (contactEmailEl) {
    contactEmailEl.addEventListener('input', function() {
      interactions.contactEmail = true;
      if (!this.value || this.value.trim() === '' || !isValidEmail(this.value)) {
        showFieldError('contactEmail', 'contactEmailError', true);
      } else {
        showFieldError('contactEmail', 'contactEmailError', false);
      }
    });
  }
}

/**
 * File upload handlers
 */
function handleFileSelect(event, fileType) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (fileType === 'applicant' && !file.name.endsWith('.csv')) {
    alert('Please upload a CSV file');
    event.target.value = '';
    return;
  }

  if (fileType === 'logo' && !file.type.startsWith('image/')) {
    alert('Please upload an image file');
    event.target.value = '';
    return;
  }

  // Store the selected file
  selectedFiles[fileType] = file;

  // Display file information
  const displayId = fileType === 'applicant' ? 'selectedFileDisplay' : 'selectedLogoDisplay';
  const nameId = fileType === 'applicant' ? 'selectedFileName' : 'selectedLogoName';

  const display = document.getElementById(displayId);
  const fileName = document.getElementById(nameId);

  if (fileName) fileName.textContent = file.name;

  // Show file size for applicant files only
  if (fileType === 'applicant') {
    const fileSize = document.getElementById('selectedFileSize');
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
  }

  // Show the file display (remove hidden, add show)
  if (display) {
    display.classList.remove('hidden');
    display.classList.add('show');
  }
}

function removeFile(fileType) {
  selectedFiles[fileType] = null;

  const inputId = fileType === 'applicant' ? 'applicantFileInput' : 'logoUpload';
  const displayId = fileType === 'applicant' ? 'selectedFileDisplay' : 'selectedLogoDisplay';

  const inputEl = document.getElementById(inputId);
  const displayEl = document.getElementById(displayId);
  
  if (inputEl) inputEl.value = '';
  
  // Hide the file display (add hidden, remove show)
  if (displayEl) {
    displayEl.classList.add('hidden');
    displayEl.classList.remove('show');
  }

  // Set logoPresent to false when logo is removed
  if (fileType === 'logo') {
    const logoPresentEl = document.getElementById('logoPresent');
    if (logoPresentEl) logoPresentEl.setAttribute('value', 'false');
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Data file upload
 */
function uploadApplicantFile() {
  if (!selectedFiles.applicant) {
    alert('Please select a file first');
    return;
  }
  uploadDataFile();
}

function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

async function uploadDataFile() {
  const apiRoot = getApiRoot();
  const formData = new FormData();

  formData.append('file', selectedFiles.applicant);
  formData.append('baseFilename', document.getElementById('targetFileName').value);
  formData.append('replaceFileMode', true);

  try {
    const response = await fetch(`${apiRoot}/admin/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const jsonData = await response.json();

    // Show upload response message
    const uploadResponseMsg = document.getElementById('uploadResponseMessage');
    if (uploadResponseMsg) uploadResponseMsg.classList.remove('hidden');

    if (response.status !== 200) {
      // Show error state
      const successStatus = document.getElementById('successUploadStatus');
      const failedStatus = document.getElementById('failedUploadStatus');
      const uploadStatusMsg = document.getElementById('uploadStatusMessage');
      const uploadErrorBlock = document.getElementById('uploadErrorBlock');

      if (successStatus) successStatus.classList.add('hidden');
      if (failedStatus) failedStatus.classList.remove('hidden');
      if (uploadStatusMsg) {
        uploadStatusMsg.textContent = `Upload failed for "${selectedFiles.applicant?.name ?? 'file'}"`;
      }

      if (uploadErrorBlock) {
        uploadErrorBlock.classList.remove('hidden');
        let errorHtml = `<h4 class="error-title">Errors:</h4><p class="error-item">${jsonData.message}</p>`;

        // Display validation errors
        if (jsonData.validation_errors && jsonData.validation_errors.length > 0) {
          errorHtml += `<h5 class="error-subtitle">Unacceptable cells:</h5><ul class="error-list">`;
          jsonData.validation_errors.forEach(error => {
            errorHtml += `<li class="error-item">${error}</li>`;
          });
          errorHtml += `</ul>`;
        }

        uploadErrorBlock.innerHTML = errorHtml;
      }
    } else {
      // Show success state
      const failedStatus = document.getElementById('failedUploadStatus');
      const successStatus = document.getElementById('successUploadStatus');
      const uploadStatusMsg = document.getElementById('uploadStatusMessage');
      const uploadErrorBlock = document.getElementById('uploadErrorBlock');

      if (failedStatus) failedStatus.classList.add('hidden');
      if (uploadErrorBlock) uploadErrorBlock.classList.add('hidden');
      if (successStatus) successStatus.classList.remove('hidden');
      if (uploadStatusMsg) uploadStatusMsg.textContent = jsonData.message;
    }

    // Show row counts
    const rowsUploadedEl = document.getElementById('rowsUploaded');
    const rowsUploadedMsgEl = document.getElementById('rowsUploadedsMessage');
    if (isNumber(jsonData.valid_rows_count)) {
      if (rowsUploadedEl) rowsUploadedEl.classList.remove('hidden');
      if (rowsUploadedMsgEl) rowsUploadedMsgEl.textContent = jsonData.valid_rows_count;
    } else {
      if (rowsUploadedEl) rowsUploadedEl.classList.add('hidden');
    }

    const failedRowsEl = document.getElementById('failedRows');
    const failedRowsMsgEl = document.getElementById('failedRowsMessage');
    if (isNumber(jsonData.invalid_rows_count)) {
      if (failedRowsEl) failedRowsEl.classList.remove('hidden');
      if (failedRowsMsgEl) {
        failedRowsMsgEl.textContent = jsonData.invalid_rows_count;
        failedRowsMsgEl.style.color = jsonData.invalid_rows_count > 0 ? 'red' : '';
      }
    } else {
      if (failedRowsEl) failedRowsEl.classList.add('hidden');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showMsgAlert('error', 'An error occurred during upload');
  }
}

/**
 * Logout functionality
 */
function logout() {
  const apiRoot = getApiRoot();

  fetch(`${apiRoot}/admin/api/logout`, {
    method: 'POST',
  }).then(() => {
    window.location.href = '/';
  }).catch(error => {
    console.error('Logout error:', error);
    window.location.href = '/';
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}
