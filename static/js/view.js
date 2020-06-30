/**
 * Copyright 2020 Google LLC
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

const _ = require("lodash");
const Cookies = require("js-cookie");
const util = require("./util.js");

const TEXT = "text";

/**
 * Get the current view state.
 *
 * @return {boolean} Whether the page is text-view mode.
 */
function isTextView() {
  const radioButtons = document.getElementsByClassName("toggle-view");
  for (const radioButton of Array.from(radioButtons)) {
    if (radioButton.value == TEXT) {
      return radioButton.checked;
    }
  }
  return false;
}

/**
 * Setup listener of view toggle radio buttons.
 */
function setupViewToggle() {
  const radioButtons = document.getElementsByClassName("toggle-view");
  _.forEach(radioButtons, (radioButton) => {
    radioButton.addEventListener("click", (e) => {
      Cookies.set("datcomDisplayMode", e.target.value);
      const showText = e.target.value == TEXT;

      const textViewElems = document.getElementsByClassName("text-view");
      const chartViewElems = document.getElementsByClassName("chart-view");
      _.forEach(chartViewElems, (elem) => {
        util.setElementShown(elem, !showText);
      });
      _.forEach(textViewElems, (elem) => {
        util.setElementShown(elem, showText);
      });
      const moreEls = document.getElementsByClassName("more");
      for (let moreEl of moreEls) {
        moreEl.parentNode.removeChild(moreEl);
      }
      const cardEls = document.getElementsByClassName("cards");
      _.forEach(cardEls, (cardEl) => {
        cardEl.style.height = "auto";
      });
      util.appendMoreToAll();
    });
  });
}

export { isTextView, setupViewToggle };
