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

import _ from "lodash";
import { setElementShown, appendMoreToAll } from "../shared/util";
import Cookies from "js-cookie";

const TEXT = "text";

/**
 * Get the current view state.
 *
 * @return Whether the page is text-view mode.
 */
function isTextView(): boolean {
  const radioButtons = document.getElementsByClassName("toggle-view");
  for (let i = 0; i < radioButtons.length; i++) {
    if ((<HTMLInputElement>radioButtons[i]).value == TEXT) {
      return (<HTMLInputElement>radioButtons[i]).checked;
    }
  }
  return false;
}

/**
 * Setup listener of view toggle radio buttons.
 */
function setupViewToggle(): void {
  const radioButtons = document.getElementsByClassName("toggle-view");
  _.forEach(radioButtons, (radioButton) => {
    radioButton.addEventListener("click", (e) => {
      Cookies.set("datcomDisplayMode", (<HTMLTextAreaElement>e.target).value);
      const showText = (<HTMLTextAreaElement>e.target).value == TEXT;

      const textViewElems = document.getElementsByClassName("text-view");
      const chartViewElems = document.getElementsByClassName("chart-view");
      _.forEach(chartViewElems, (elem) => {
        setElementShown(elem, !showText);
      });
      _.forEach(textViewElems, (elem) => {
        setElementShown(elem, showText);
      });
      const moreEls = document.getElementsByClassName("more");
      for (let i = 0; i < moreEls.length; i++) {
        moreEls[i].parentNode.removeChild(moreEls[i]);
      }
      const cardEls = document.getElementsByClassName("cards");
      _.forEach(cardEls, (cardEl) => {
        (<HTMLElement>cardEl).style.height = "auto";
      });
      appendMoreToAll();
    });
  });
}

export { isTextView, setupViewToggle };
