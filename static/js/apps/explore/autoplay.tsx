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
 * Component for auto playing a single query.
 */

import queryString from "query-string";
import React from "react";
import { useEffect, useRef } from "react";

import { URL_HASH_PARAMS } from "../../constants/app/explore_constants";

const PROMPT_SEARCH_DELAY = 1000;
const CHARACTER_INPUT_INTERVAL = 50;
const NEXT_PROMPT_DELAY = 5000;

interface AutoPlayPropType {
  // Query to auto play.
  autoPlayQuery: string;
  // Function to call to input the query.
  inputQuery: (query: string) => void;
  // Whether or not to disable the delay before starting to autoplay a query.
  disableDelay: boolean;
}

export function AutoPlay(props: AutoPlayPropType): JSX.Element {
  const autoPlaySettings = useRef(getAutoPlaySettings());
  // Timer used to input characters from a single prompt with
  // CHARACTER_INPUT_INTERVAL ms between each character.
  const inputIntervalTimer = useRef(null);
  // Timer used to wait NEXT_PROMPT_DELAY ms before inputting a new prompt.
  const nextPromptDelayTimer = useRef(null);
  // Timer used to wait PROMPT_SEARCH_DELAY ms before searching for an inputted
  // prompt.
  const searchDelayTimer = useRef(null);

  function getAutoPlaySettings(): {
    disableTyping: boolean;
    manualEnter: boolean;
  } {
    const hashParams = queryString.parse(window.location.hash);
    const settings = {
      disableTyping: !!hashParams[URL_HASH_PARAMS.AUTO_PLAY_DISABLE_TYPING],
      manualEnter: !!hashParams[URL_HASH_PARAMS.AUTO_PLAY_MANUAL_ENTER],
    };
    return settings;
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // When component unmounts, clear all timers
      clearInterval(inputIntervalTimer.current);
      clearTimeout(searchDelayTimer.current);
      clearTimeout(nextPromptDelayTimer.current);
    };
  }, [inputIntervalTimer, searchDelayTimer, nextPromptDelayTimer]);

  useEffect(() => {
    if (!props.autoPlayQuery) {
      return;
    }
    const promptSearchDelay = autoPlaySettings.current.disableTyping
      ? 0
      : PROMPT_SEARCH_DELAY;
    const nextPromptDelay = props.disableDelay ? 0 : NEXT_PROMPT_DELAY;
    nextPromptDelayTimer.current = setTimeout(() => {
      // If typing is disabled, input the whole prompt at once
      let inputLength = autoPlaySettings.current.disableTyping
        ? props.autoPlayQuery.length
        : 1;
      inputIntervalTimer.current = setInterval(() => {
        if (inputLength <= props.autoPlayQuery.length) {
          props.inputQuery(props.autoPlayQuery.substring(0, inputLength));
        }
        if (inputLength === props.autoPlayQuery.length) {
          clearInterval(inputIntervalTimer.current);
          // If not in the mode where user has to manually click enter,
          // automatically click the search button after promptSearchDelay
          if (!autoPlaySettings.current.manualEnter) {
            searchDelayTimer.current = setTimeout(() => {
              (
                document.getElementById(
                  "rich-search-button"
                ) as HTMLButtonElement
              ).click();
            }, promptSearchDelay);
          }
          return;
        }
        inputLength++;
      }, CHARACTER_INPUT_INTERVAL);
    }, nextPromptDelay);
  }, [props.autoPlayQuery]);

  return <></>;
}
