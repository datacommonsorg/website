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

window.onload = () => {
  const CHARACTER_INPUT_INTERVAL_MS = 30;
  const NEXT_PROMPT_DELAY_MS = 4000; // (110) * CHARACTER_INPUT_INTERVAL;
  const INITIAL_START_DELAY_MS = 100;
  const FADE_OUT_MS = 800;

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

  // return;

  setTimeout(() => {
    console.log("outer timer");
    nextInputTimer = setInterval(() => {
      // console.log("next prompt", currentPromptIndex);
      let inputLength = 0;
      if (currentPromptIndex < resultsElList.length) {
        prompt = resultsElList.item(currentPromptIndex);
      } else {
        console.log("End the animation", currentPromptIndex);
        setTimeout(() => {
          defaultTextContainer.classList.remove("fade-out");
        }, FADE_OUT_MS);
        searchSequenceContainer.classList.add("fade-out");
        // resultsElList.item(currentPromptIndex - 1).classList.add("fade-out");
        // inputEl.value = "Enter a question or topic to explore...";
        clearInterval(nextInputTimer);
        nextInputTimer = undefined;
      }
      if (nextInputTimer) {
        if (currentPromptIndex == 0) {
          defaultTextContainer.classList.add("fade-out");
          // document.getElementById("default-text").classList.add("hidden");
          searchSequenceContainer.classList.remove("hidden");
        } else {
          resultsElList.item(currentPromptIndex - 1).classList.add("fade-out");
        }
        inputIntervalTimer = setInterval(() => {
          // console.log("input interval", inputLength);
          if (inputLength <= prompt.dataset.query.length) {
            inputEl.value = prompt.dataset.query.substring(0, inputLength);
          }
          if (inputLength === prompt.dataset.query.length) {
            clearInterval(inputIntervalTimer);
            console.log("update answer: autoplay index", currentPromptIndex);
            console.log(prompt);
            // defaultTextContainer.classList.add("hidden");
            defaultTextContainer.classList.add("fade-out");
            svgDiv.classList.remove("hidden");
            prompt.classList.remove("hidden");
            prompt.classList.add("slide-down");
            if (currentPromptIndex > 0) {
              resultsElList
                .item(currentPromptIndex - 1)
                .classList.add("hidden");
            }
            console.log(svgDiv.style);

            currentPromptIndex++;
            return;
          }
          inputLength++;
        }, CHARACTER_INPUT_INTERVAL_MS);
      }
    }, NEXT_PROMPT_DELAY_MS);
  }, INITIAL_START_DELAY_MS);
};
