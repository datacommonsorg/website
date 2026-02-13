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

// Note: This file uses legacy imports via window globals from alert.js
// getApiRoot and fetchData are also available as window globals

function getApiRoot() {
  const params = new URLSearchParams(location.search);
  return params.get("apiRoot") || location.origin || "https://datacommons.org";
}

async function fetchData(callback) {
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

// Tab Switching
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
  document.getElementById(tabName + '-tab').classList.add('active');

  // Add active class to clicked tab
  event.currentTarget.classList.add('active');
}

async function saveChangesRequest() {
  const apiRoot = getApiRoot();

  const formData = new FormData();

  if (selectedFiles.logo) {
    formData.append('file', selectedFiles.logo);
    document.getElementById('logoPresent').setAttribute('value', "true");
  }
  formData.append('domainName', document.getElementById('domainName').value)
  formData.append('descriptionTitle', document.getElementById('descriptionTitle').value)
  formData.append('descriptionBody', document.getElementById('descriptionBody').value)
  formData.append('logoPresent', document.getElementById('logoPresent').value)
  formData.append('contactEmail', document.getElementById('contactEmail').value)

  const response = await fetch(`${apiRoot}/admin/api/update-config`, {
    method: 'POST',
    body: formData,
  });

  const json_data = await response.json();

  if (response.status === 200) {
    showMsgAlert('success', json_data.message);
  } else {
    showMsgAlert('error', 'Domain config were not saved!');
  }
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Validation helpers
function showFieldError(fieldId, errorId, showError) {
  const errorEl = document.getElementById(errorId);
  const fieldEl = document.getElementById(fieldId);
  if (!errorEl || !fieldEl) return;
  
  if (showError) {
    errorEl.style.display = 'block';
    fieldEl.style.setProperty('--md-outlined-text-field-outline-color', '#EA4335');
    fieldEl.style.setProperty('--md-outlined-text-field-focus-outline-color', '#EA4335');
  } else {
    errorEl.style.display = 'none';
    fieldEl.style.setProperty('--md-outlined-text-field-outline-color', '#DADCE0');
    fieldEl.style.setProperty('--md-outlined-text-field-focus-outline-color', '#1A73E8');
  }
}

function validateAllFields() {
  let isValid = true;
  
  // Validate University Name
  const domainNameEl = document.getElementById('domainName');
  if (!domainNameEl || !domainNameEl.value || domainNameEl.value.trim() === '') {
    showFieldError('domainName', 'domainNameError', true);
    isValid = false;
  } else {
    showFieldError('domainName', 'domainNameError', false);
  }
  
  // Validate Header Text
  const descriptionTitleEl = document.getElementById('descriptionTitle');
  if (!descriptionTitleEl || !descriptionTitleEl.value || descriptionTitleEl.value.trim() === '') {
    showFieldError('descriptionTitle', 'descriptionTitleError', true);
    isValid = false;
  } else {
    showFieldError('descriptionTitle', 'descriptionTitleError', false);
  }
  
  // Validate Contact Email
  const contactEmailEl = document.getElementById('contactEmail');
  if (!contactEmailEl || !contactEmailEl.value || !isValidEmail(contactEmailEl.value)) {
    showFieldError('contactEmail', 'contactEmailError', true);
    isValid = false;
  } else {
    showFieldError('contactEmail', 'contactEmailError', false);
  }
  
  // Validate Hero Description
  const descriptionBodyEl = document.getElementById('descriptionBody');
  if (!descriptionBodyEl || !descriptionBodyEl.value || descriptionBodyEl.value.trim() === '') {
    showFieldError('descriptionBody', 'descriptionBodyError', true);
    isValid = false;
  } else {
    showFieldError('descriptionBody', 'descriptionBodyError', false);
  }
  
  return isValid;
}

// Save Changes
function saveChanges() {
  if (!validateAllFields()) {
    showMsgAlert('error', 'Please fill in all required fields correctly.');
    return;
  }
  saveChangesRequest();
}

// Reusable File Upload Functions
const selectedFiles = {
  applicant: null,
  logo: null
};

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

  fileName.textContent = file.name;

  // Show file size for applicant files only
  if (fileType === 'applicant') {
    const fileSize = document.getElementById('selectedFileSize');
    fileSize.textContent = formatFileSize(file.size);
  }

  display.classList.add('show');
}

function removeFile(fileType) {
  selectedFiles[fileType] = null;

  const inputId = fileType === 'applicant' ? 'applicantFileInput' : 'logoUpload';
  const displayId = fileType === 'applicant' ? 'selectedFileDisplay' : 'selectedLogoDisplay';

  document.getElementById(inputId).value = '';
  document.getElementById(displayId).classList.remove('show');

  // Set logoPresent to false when logo is removed
  if (fileType === 'logo') {
    document.getElementById('logoPresent').setAttribute('value', 'false');
  }
}

function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v); // excludes NaN, Infinity
}

async function uploadDataFile() {
  const apiRoot = getApiRoot();

  const formData = new FormData();

  formData.append('file', selectedFiles.applicant);
  formData.append('baseFilename', 'recruitment_insights.csv');
  formData.append('replaceFileMode', true);

  const response = await fetch(`${apiRoot}/admin/api/upload`, {
    method: 'POST',
    body: formData,
  });

  const json_data = await response.json();

  // Show the response message container
  document.getElementById('uploadResponseMessage').classList.remove('hidden');

  if (response.status !== 200) {
    document.getElementById('successUploadStatus').classList.add('hidden');
    document.getElementById('failedUploadStatus').classList.remove('hidden');
    document.getElementById('uploadStatusMessage').textContent = `Upload failed for "${selectedFiles.applicant?.name ?? 'file'}"`;

    document.getElementById('uploadErrorBlock').classList.remove('hidden');
    let errorHtml = `<h4 class="error-title">Errors:</h4><p class="error-item">${json_data.message}</p>`;

    // Display validation errors (failed lines) if present
    if (json_data.validation_errors && json_data.validation_errors.length > 0) {
      errorHtml += `<h5 class="error-subtitle">Unacceptable cells:</h5><ul class="error-list">`;
      json_data.validation_errors.forEach(error => {
        errorHtml += `<li class="error-item">${error}</li>`;
      });
      errorHtml += `</ul>`;
    }

    document.getElementById('uploadErrorBlock').innerHTML = errorHtml;
  } else {
    document.getElementById('failedUploadStatus').classList.add('hidden');
    document.getElementById('uploadErrorBlock').classList.add('hidden');
    document.getElementById('successUploadStatus').classList.remove('hidden');
    document.getElementById('uploadStatusMessage').textContent = json_data.message;
  }

  if (isNumber(json_data.valid_rows_count)) {
    document.getElementById('rowsUploaded').classList.remove('hidden');
    document.getElementById('rowsUploadedsMessage').textContent = json_data.valid_rows_count;
  } else {
    document.getElementById('rowsUploaded').classList.add('hidden');
  }

  if (isNumber(json_data.invalid_rows_count)) {
    document.getElementById('failedRows').classList.remove('hidden');
    document.getElementById('failedRowsMessage').textContent = json_data.invalid_rows_count;
    document.getElementById('failedRowsMessage').style.color = json_data.invalid_rows_count > 0 ? 'red' : '';
  } else {
    document.getElementById('failedRows').classList.add('hidden');
  }

}

function uploadApplicantFile() {
  if (!selectedFiles.applicant) {
    alert('Please select a file first');
    return;
  }

  uploadDataFile();
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function render(domainInfo) {
  const domainNameEl = document.getElementById('domainName');
  const descriptionTitleEl = document.getElementById('descriptionTitle');
  const descriptionBodyEl = document.getElementById('descriptionBody');
  const logoPresentEl = document.getElementById('logoPresent');
  const contactEmailEl = document.getElementById('contactEmail');

  if (domainNameEl) domainNameEl.value = domainInfo.domainName || '';
  if (descriptionTitleEl) descriptionTitleEl.value = domainInfo.descriptionTitle || '';
  if (descriptionBodyEl) descriptionBodyEl.value = domainInfo.descriptionBody || '';
  if (logoPresentEl) logoPresentEl.setAttribute('value', domainInfo.logoPresent || 'false');
  if (contactEmailEl) contactEmailEl.value = domainInfo.contactEmail || '';

  // Show current logo if exists
  if (domainInfo.logoPresent === "true") {
    const selectedLogoNameEl = document.getElementById('selectedLogoName');
    const selectedLogoDisplayEl = document.getElementById('selectedLogoDisplay');
    if (selectedLogoNameEl) selectedLogoNameEl.textContent = 'logo.png';
    if (selectedLogoDisplayEl) selectedLogoDisplayEl.classList.add('show');

    // Update favicon - get URL from data attribute set in HTML
    const faviconUrl = document.getElementById('faviconLogo')?.dataset.logoUrl;
    if (faviconUrl) {
      $('#faviconLogo').attr('href', faviconUrl);
    }
  }
}

function logout() {
  const apiRoot = getApiRoot();

  fetch(`${apiRoot}/admin/api/logout`, {
    method: 'POST',
  }).then((r) => {
    window.location.href = '/';
  })
}

// Real-time form validation
function setupFormValidation() {
  const interactions = {
    domainName: false,
    descriptionTitle: false,
    contactEmail: false,
    descriptionBody: false
  };
  
  // University Name validation
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
  
  // Header Text validation
  const descriptionTitleEl = document.getElementById('descriptionTitle');
  if (descriptionTitleEl) {
    descriptionTitleEl.addEventListener('input', function() {
      interactions.descriptionTitle = true;
      if (!this.value || this.value.trim() === '') {
        showFieldError('descriptionTitle', 'descriptionTitleError', true);
      } else {
        showFieldError('descriptionTitle', 'descriptionTitleError', false);
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
  
  // Hero Description validation
  const descriptionBodyEl = document.getElementById('descriptionBody');
  if (descriptionBodyEl) {
    descriptionBodyEl.addEventListener('input', function() {
      interactions.descriptionBody = true;
      if (!this.value || this.value.trim() === '') {
        showFieldError('descriptionBody', 'descriptionBodyError', true);
      } else {
        showFieldError('descriptionBody', 'descriptionBodyError', false);
      }
    });
  }
}

// Wait for DOM and web components to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    fetchData(render);
    setupFormValidation();
  });
} else {
  fetchData(render);
  setupFormValidation();
}
