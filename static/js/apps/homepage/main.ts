import { NL_SOURCE_REPLACEMENTS } from './../../constants/app/nl_interface_constants';
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

import { NL_SOURCE_REPLACEMENTS } from "./../../constants/app/nl_interface_constants";
import { App } from "./app";

window.onload = () => {
  // Homepage animation.
  const CHARACTER_INPUT_INTERVAL_MS = 45;
  const NEXT_PROMPT_DELAY_MS = 5000;
  const INITIAL_MISSION_ON_SCREEN_DELAY_MS = 2000;
  const INITIAL_MISSION_FADE_IN_DELAY_MS = 1000;
  const ANSWER_DELAY_MS = 2000;
  const FADE_OUT_MS = 800;
  const FADE_OUT_CLASS = "fade-out";
  const HIDDEN_CLASS = "hidden";
  const SLIDE_DOWN_CLASS = "slide-down";
  const INVISIBLE_CLASS = "invisible";
  const FADE_IN_CLASS = "fade-in";

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
  const promptDiv: HTMLDivElement = <HTMLDivElement>(
    document.getElementById("header-prompt")
  );
  const missionDiv: HTMLDivElement = <HTMLDivElement>(
    document.getElementById("header-mission")
  );
  const resultsElList = svgDiv.getElementsByClassName("result");

  searchSequenceContainer.onclick = () => {
    if (prompt) {
      window.location.href = `/explore#q=${encodeURIComponent(
        prompt.dataset.query
      )}`;
    }
  };

  function startNextPrompt() {
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
      return;
    }
    // Fade out the previous query
    if (currentPromptIndex == 0) {
      defaultTextContainer.classList.add(FADE_OUT_CLASS);
      searchSequenceContainer.classList.remove(HIDDEN_CLASS);
    } else {
      resultsElList.item(currentPromptIndex - 1).classList.add(FADE_OUT_CLASS);
    }
    setTimeout(() => {
      if (currentPromptIndex == 0) {
        defaultTextContainer.classList.add(FADE_OUT_CLASS);
        svgDiv.classList.remove(HIDDEN_CLASS);
        promptDiv.classList.add(HIDDEN_CLASS);
        missionDiv.classList.remove(HIDDEN_CLASS);
      }
      prompt.classList.remove(HIDDEN_CLASS);
      prompt.classList.add(SLIDE_DOWN_CLASS);
      if (currentPromptIndex > 0) {
        resultsElList.item(currentPromptIndex - 1).classList.add(HIDDEN_CLASS);
      }
      currentPromptIndex++;
    }, ANSWER_DELAY_MS);

    inputIntervalTimer = setInterval(() => {
      // Start typing animation
      if (inputLength <= prompt.dataset.query.length) {
        inputEl.value = prompt.dataset.query.substring(0, inputLength);
        // Set scrollLeft so we always see the full input even on narrow screens
        inputEl.scrollLeft = inputEl.scrollWidth;
        inputLength++;
      } else {
        // Slide in the answer
        clearInterval(inputIntervalTimer);
      }
    }, CHARACTER_INPUT_INTERVAL_MS);
  }

  setTimeout(() => {
    promptDiv.classList.remove(INVISIBLE_CLASS);
    promptDiv.classList.add(FADE_IN_CLASS);
    setTimeout(() => {
      startNextPrompt();
      nextInputTimer = setInterval(() => {
        startNextPrompt();
      }, NEXT_PROMPT_DELAY_MS);
    }, INITIAL_MISSION_ON_SCREEN_DELAY_MS);
  }, INITIAL_MISSION_FADE_IN_DELAY_MS);

  // Initialize search box.
  ReactDOM.render(
    React.createElement(App),
    document.getElementById("search-container")
  );
};
