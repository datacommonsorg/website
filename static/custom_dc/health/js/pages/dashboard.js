import { getApiRoot, fetchData } from '../utils/api.js';

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
    const logoPresentEl = document.getElementById('logoPresent');
    if (logoPresentEl) logoPresentEl.setAttribute('value', "true");
  }
  
  const cityNameEl = document.getElementById('cityName');
  const domainNameEl = document.getElementById('domainName');
  const logoPresentEl = document.getElementById('logoPresent');
  const contactEmailEl = document.getElementById('contactEmail');

  if (cityNameEl && cityNameEl.value) formData.append('mainCity', cityNameEl.value);
  if (domainNameEl && domainNameEl.value) formData.append('domainName', domainNameEl.value);
  if (logoPresentEl && logoPresentEl.value) formData.append('logoPresent', logoPresentEl.value);
  if (contactEmailEl && contactEmailEl.value) formData.append('contactEmail', contactEmailEl.value);

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
    errorEl.classList.remove('hidden');
    if (fieldEl.tagName === 'MD-OUTLINED-TEXT-FIELD') {
      fieldEl.style.setProperty('--md-outlined-text-field-outline-color', '#EA4335');
      fieldEl.style.setProperty('--md-outlined-text-field-focus-outline-color', '#EA4335');
    } else if (fieldEl.tagName === 'MD-OUTLINED-SELECT') {
      fieldEl.style.setProperty('--md-outlined-select-text-field-outline-color', '#EA4335');
      fieldEl.style.setProperty('--md-outlined-select-text-field-focus-outline-color', '#EA4335');
    }
  } else {
    errorEl.classList.add('hidden');
    if (fieldEl.tagName === 'MD-OUTLINED-TEXT-FIELD') {
      fieldEl.style.setProperty('--md-outlined-text-field-outline-color', '#DADCE0');
      fieldEl.style.setProperty('--md-outlined-text-field-focus-outline-color', '#1A73E8');
    } else if (fieldEl.tagName === 'MD-OUTLINED-SELECT') {
      fieldEl.style.setProperty('--md-outlined-select-text-field-outline-color', '#E8EAED');
      fieldEl.style.setProperty('--md-outlined-select-text-field-focus-outline-color', '#1A73E8');
    }
  }
}

function validateAllFields() {
  let isValid = true;
  
  // Validate City
  const cityNameEl = document.getElementById('cityName');
  if (!cityNameEl || !cityNameEl.value || cityNameEl.value.trim() === '') {
    showFieldError('cityName', 'cityNameError', true);
    isValid = false;
  } else {
    showFieldError('cityName', 'cityNameError', false);
  }
  
  // Validate Organization Name
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
  formData.append('baseFilename', 'health_inisghts.csv');
  formData.append('replaceFileMode', true);

  const response = await fetch(`${apiRoot}/admin/api/upload`, {
    method: 'POST',
    body: formData,
  });

  const json_data = await response.json();

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
  const cityNameEl = document.getElementById('cityName');
  const domainNameEl = document.getElementById('domainName');
  const logoPresentEl = document.getElementById('logoPresent');
  const contactEmailEl = document.getElementById('contactEmail');

  if (cityNameEl && domainInfo.cityName) cityNameEl.value = domainInfo.cityName;
  if (domainNameEl) domainNameEl.value = domainInfo.domainName || '';
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
  // Track if user has interacted with each field
  const interactions = {
    cityName: false,
    domainName: false,
    contactEmail: false
  };
  
  // City Name validation
  const cityNameEl = document.getElementById('cityName');
  if (cityNameEl) {
    cityNameEl.addEventListener('change', function() {
      interactions.cityName = true;
      validateCityField();
    });
    
    cityNameEl.addEventListener('blur', function() {
      if (interactions.cityName) {
        validateCityField();
      }
    });
  }
  
  function validateCityField() {
    const value = cityNameEl ? cityNameEl.value : '';
    if (!value || value.trim() === '') {
      showFieldError('cityName', 'cityNameError', true);
    } else {
      showFieldError('cityName', 'cityNameError', false);
    }
  }
  
  // Organization Name validation
  const domainNameEl = document.getElementById('domainName');
  if (domainNameEl) {
    domainNameEl.addEventListener('input', function() {
      interactions.domainName = true;
      validateDomainField();
    });
    
    domainNameEl.addEventListener('blur', function() {
      if (interactions.domainName) {
        validateDomainField();
      }
    });
  }
  
  function validateDomainField() {
    const value = domainNameEl ? domainNameEl.value : '';
    if (!value || value.trim() === '') {
      showFieldError('domainName', 'domainNameError', true);
    } else {
      showFieldError('domainName', 'domainNameError', false);
    }
  }
  
  // Contact Email validation
  const contactEmailEl = document.getElementById('contactEmail');
  if (contactEmailEl) {
    contactEmailEl.addEventListener('input', function() {
      interactions.contactEmail = true;
      validateEmailField();
    });
    
    contactEmailEl.addEventListener('blur', function() {
      if (interactions.contactEmail) {
        validateEmailField();
      }
    });
  }
  
  function validateEmailField() {
    const value = contactEmailEl ? contactEmailEl.value : '';
    
    // Show error if empty or invalid email format
    if (!value || value.trim() === '' || !isValidEmail(value)) {
      showFieldError('contactEmail', 'contactEmailError', true);
    } else {
      showFieldError('contactEmail', 'contactEmailError', false);
    }
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

// Expose functions to window for onclick handlers in HTML
window.switchTab = switchTab;
window.logout = logout;
window.removeFile = removeFile;
window.uploadApplicantFile = uploadApplicantFile;
window.saveChanges = saveChanges;
window.handleFileSelect = handleFileSelect;
