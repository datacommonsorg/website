/**
 * Copyright 2024 Google LLC
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

import React, { ReactElement, useEffect, useRef } from "react";

const SearchAnimation = (): ReactElement => {
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
  const ANIMATION_TOGGLE_COOKIE_NAME = "keepAnimationClosed";
  const ANIMATION_TOGGLE_MARGIN = "6px";
  const MAX_COOKIE_AGE = 60 * 60 * 24;

  const currentPromptIndex = useRef(0);
  const currentPrompt = useRef<HTMLElement | null>(null);
  const inputIntervalTimer = useRef<ReturnType<typeof setTimeout>>();
  const nextInputTimer = useRef<ReturnType<typeof setTimeout>>();
  const inputEl = useRef<HTMLInputElement>(null);
  const searchAnimationContainer = useRef<HTMLDivElement>(null);
  const searchSequenceContainer = useRef<HTMLDivElement>(null);
  const defaultTextContainer = useRef<HTMLDivElement>(null);
  const svgDiv = useRef<HTMLDivElement>(null);
  const promptDiv = useRef<HTMLDivElement>(null);
  const missionDiv = useRef<HTMLDivElement>(null);
  const resultsElList = useRef<NodeListOf<HTMLDivElement>>();

  useEffect(() => {
    resultsElList.current = document.querySelectorAll("#result-svg .result");

    if (
      !resultsElList.current ||
      !promptDiv.current ||
      !svgDiv.current ||
      !missionDiv.current ||
      !defaultTextContainer.current ||
      !searchSequenceContainer.current
    ) {
      return;
    }

    const startNextPrompt = (): void => {
      let inputLength = 0;
      const prompt = resultsElList.current.item(
        currentPromptIndex.current
      ) as HTMLElement;
      currentPrompt.current = prompt;

      if (currentPromptIndex.current >= resultsElList.current.length) {
        setTimeout(() => {
          defaultTextContainer.current.classList.remove(FADE_OUT_CLASS);
        }, FADE_OUT_MS);
        searchSequenceContainer.current.classList.add(FADE_OUT_CLASS);
        clearInterval(nextInputTimer.current);
        return;
      }

      if (currentPromptIndex.current === 0) {
        defaultTextContainer.current.classList.add(FADE_OUT_CLASS);
        searchSequenceContainer.current.classList.remove(HIDDEN_CLASS);
      } else {
        resultsElList.current
          .item(currentPromptIndex.current - 1)
          .classList.add(FADE_OUT_CLASS);
      }

      setTimeout(() => {
        if (currentPromptIndex.current === 0) {
          defaultTextContainer.current.classList.add(FADE_OUT_CLASS);
          svgDiv.current.classList.remove(HIDDEN_CLASS);
          promptDiv.current.classList.add(HIDDEN_CLASS);
          missionDiv.current.classList.remove(HIDDEN_CLASS);
        }
        prompt.classList.remove(HIDDEN_CLASS);
        prompt.classList.add(SLIDE_DOWN_CLASS);

        if (currentPromptIndex.current > 0) {
          resultsElList.current
            .item(currentPromptIndex.current - 1)
            .classList.add(HIDDEN_CLASS);
        }
        currentPromptIndex.current++;
      }, ANSWER_DELAY_MS);

      inputIntervalTimer.current = setInterval(() => {
        if (inputLength <= prompt.dataset.query.length) {
          if (inputEl.current) {
            inputEl.current.value =
              prompt.dataset.query?.substring(0, inputLength) || "";
            inputEl.current.scrollLeft = inputEl.current.scrollWidth;
          }
          inputLength++;
        } else {
          clearInterval(inputIntervalTimer.current);
        }
      }, CHARACTER_INPUT_INTERVAL_MS);
    };

    setTimeout(() => {
      promptDiv.current.classList.remove(INVISIBLE_CLASS);
      promptDiv.current.classList.add(FADE_IN_CLASS);
      setTimeout(() => {
        startNextPrompt();
        nextInputTimer.current = setInterval(() => {
          startNextPrompt();
        }, NEXT_PROMPT_DELAY_MS);
      }, INITIAL_MISSION_ON_SCREEN_DELAY_MS);
    }, INITIAL_MISSION_FADE_IN_DELAY_MS);

    const hideAnimation = (): void => {
      searchAnimationContainer.current.setAttribute("style", "display: none;");
      const searchAnimationToggle = document.getElementById(
        "search-animation-toggle"
      );
      searchAnimationToggle.classList.add(HIDDEN_CLASS);
      searchAnimationToggle.innerHTML =
        "<span class='material-icons-outlined'>keyboard_double_arrow_down</span>";
      searchAnimationToggle.setAttribute(
        "style",
        `margin-top: ${ANIMATION_TOGGLE_MARGIN};`
      );
      document.cookie = `${ANIMATION_TOGGLE_COOKIE_NAME}=true;max-age=${MAX_COOKIE_AGE};`;
    };

    const showAnimation = (): void => {
      searchAnimationContainer.current.setAttribute(
        "style",
        "display: visible;"
      );
      const searchAnimationToggle = document.getElementById(
        "search-animation-toggle"
      );
      searchAnimationToggle.classList.remove(HIDDEN_CLASS);
      searchAnimationToggle.innerHTML =
        "<span class='material-icons-outlined'>keyboard_double_arrow_up</span>";
      searchAnimationToggle.setAttribute(
        "style",
        `margin-bottom: ${ANIMATION_TOGGLE_MARGIN};`
      );
      document.cookie = `${ANIMATION_TOGGLE_COOKIE_NAME}=;max-age=0;`;
    };

    const searchAnimationToggle = document.getElementById(
      "search-animation-toggle"
    );
    searchAnimationToggle.addEventListener("click", () => {
      if (searchAnimationToggle.classList.contains(HIDDEN_CLASS)) {
        showAnimation();
      } else {
        hideAnimation();
      }
    });

    if (
      document.cookie
        .split(";")
        .some((item) => item.includes(`${ANIMATION_TOGGLE_COOKIE_NAME}=true`))
    ) {
      hideAnimation();
    }

    return () => {
      clearInterval(nextInputTimer.current);
      clearInterval(inputIntervalTimer.current);
    };
  }, [MAX_COOKIE_AGE]);

  const handleSearchSequenceClick = (): void => {
    if (currentPrompt.current) {
      const query = currentPrompt.current.dataset.query;
      if (query) {
        window.location.href = `/explore#q=${encodeURIComponent(query)}`;
      }
    }
  };

  return (
    <>
      <section id="search-animation">
        <div
          id="search-animation-container"
          className="container"
          ref={searchAnimationContainer}
        >
          <div id="default-text" ref={defaultTextContainer}>
            <div className="content">
              <h3 className="header">Data tells interesting stories</h3>
              <h4
                className="sub-header invisible"
                id="header-prompt"
                ref={promptDiv}
              >
                Ask a question like...
              </h4>
              <h4
                className="sub-header hidden"
                id="header-mission"
                ref={missionDiv}
              >
                Data Commons, an initiative from Google,
                <br />
                organizes the world’s publicly available data
                <br />
                and makes it more accessible and useful
              </h4>
            </div>
          </div>
          <div
            id="search-sequence"
            className="hidden"
            ref={searchSequenceContainer}
            onClick={handleSearchSequenceClick}
          >
            <input
              id="animation-search-input"
              placeholder=""
              autoComplete="off"
              type="text"
              className="pac-target-input search-input-text form-control"
              aria-invalid="false"
              value=""
              readOnly
              ref={inputEl}
            />
            <div id="result-svg" className="" ref={svgDiv}>
              <div
                className="result hidden"
                data-query="Which countries in Africa have had the greatest increase in electricity access?"
                style={{
                  backgroundImage:
                    "url('/images/home-answers/access-electricity.svg')",
                }}
              ></div>
              <div
                className="result hidden"
                data-query="How does income correlate with diabetes in US counties?"
                style={{
                  backgroundImage:
                    "url('/images/home-answers/income-diabetes.svg')",
                }}
              ></div>
              <div
                className="result hidden"
                data-query="Which counties in the US have the highest levels of diabetes?"
                style={{
                  backgroundImage: "url('/images/home-answers/diabetes.svg')",
                }}
              ></div>
              <div
                className="result hidden"
                data-query="Tell me about greenhouse gas emissions from the US"
                style={{
                  backgroundImage: "url('/images/home-answers/emissions.svg')",
                }}
              ></div>
              <div
                className="result hidden"
                data-query="Show me agricultural income by US county"
                style={{
                  backgroundImage:
                    "url('/images/home-answers/farm-income.svg')",
                }}
              ></div>
            </div>
          </div>
        </div>
      </section>
      <div id="search-animation-toggle">
        <span className="material-icons-outlined">
          keyboard_double_arrow_up
        </span>
      </div>
    </>
  );
};

export default SearchAnimation;
