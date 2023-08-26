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
 * Entrypoint file for homepage.
 */
import React from "react";
import ReactDOM from "react-dom";

import { App } from "./app";

window.onload = () => {
  // Initialize search box.
  ReactDOM.render(
    React.createElement(App),
    document.getElementById("search-container")
  );

  // Homepage animation.
  const CHARACTER_INPUT_INTERVAL_MS = 30;
  const NEXT_PROMPT_DELAY_MS = 4000;
  const INITIAL_START_DELAY_MS = 100;
  const FADE_OUT_MS = 800;
  const FADE_OUT_CLASS = "fade-out";
  const HIDDEN_CLASS = "hidden";
  const SLIDE_DOWN_CLASS = "slide-down";

  let inputIntervalTimer, nextInputTimer: ReturnType<typeof setTimeout>;
  let currentPromptIndex = 0;
  let prompt;
  const inputEl: HTMLInputElement = <HTMLInputElement>(
    document.getElementById("animation-search-input")
  );
  const searchSequenceContainer: HTMLDivElement = <HTMLDivElement>(
    document.getElementById("search-sequence")
  );
  const defaultTextContainer: HTMLDivElement = <HTMLDivElement>(
    document.getElementById("default-text")
  );
  const svgDiv: HTMLDivElement = <HTMLDivElement>(
    document.getElementById("result-svg")
  );
  const resultsElList = svgDiv.getElementsByClassName("result");

  setTimeout(() => {
    nextInputTimer = setInterval(() => {
      let inputLength = 0;
      if (currentPromptIndex < resultsElList.length) {
        prompt = resultsElList.item(currentPromptIndex);
      } else {
        // End the animation
        setTimeout(() => {
          defaultTextContainer.classList.remove(FADE_OUT_CLASS);
        }, FADE_OUT_MS);
        searchSequenceContainer.classList.add(FADE_OUT_CLASS);
        clearInterval(nextInputTimer);
        nextInputTimer = undefined;
      }
      if (nextInputTimer) {
        // Fade out the previous query
        if (currentPromptIndex == 0) {
          defaultTextContainer.classList.add(FADE_OUT_CLASS);
          searchSequenceContainer.classList.remove(HIDDEN_CLASS);
        } else {
          resultsElList
            .item(currentPromptIndex - 1)
            .classList.add(FADE_OUT_CLASS);
        }
        inputIntervalTimer = setInterval(() => {
          // Start typing animation
          if (inputLength <= prompt.dataset.query.length) {
            inputEl.value = prompt.dataset.query.substring(0, inputLength);
          }
          if (inputLength === prompt.dataset.query.length) {
            // Slide in the answer
            clearInterval(inputIntervalTimer);
            defaultTextContainer.classList.add(FADE_OUT_CLASS);
            svgDiv.classList.remove(HIDDEN_CLASS);
            prompt.classList.remove(HIDDEN_CLASS);
            prompt.classList.add(SLIDE_DOWN_CLASS);
            if (currentPromptIndex > 0) {
              resultsElList
                .item(currentPromptIndex - 1)
                .classList.add(HIDDEN_CLASS);
            }

            currentPromptIndex++;
            return;
          }
          inputLength++;
        }, CHARACTER_INPUT_INTERVAL_MS);
      }
    }, NEXT_PROMPT_DELAY_MS);
  }, INITIAL_START_DELAY_MS);
};
