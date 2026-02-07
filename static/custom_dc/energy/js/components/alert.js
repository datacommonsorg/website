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
 * Show an alert/snackbar message
 * @param {string} style - Alert style: 'success' or 'error'
 * @param {string} message - Message to display
 */
export function showMsgAlert(style, message) {
  const alertElement = document.getElementById("alertMessage");
  const alertContent = document.getElementById("alertMessageContent");
  
  if (!alertElement || !alertContent) {
    console.warn('Alert elements not found');
    return;
  }

  // Set message
  alertContent.textContent = message;

  // Set style
  alertElement.classList.remove('success', 'error');
  alertElement.classList.add(style);

  // Show alert
  alertElement.classList.add('show');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertElement.classList.remove('show');
  }, 5000);
}

// Dismiss button handler
document.addEventListener('DOMContentLoaded', () => {
  const dismissBtn = document.getElementById('alertDissmiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      const alertElement = document.getElementById('alertMessage');
      if (alertElement) {
        alertElement.classList.remove('show');
      }
    });
  }
});
