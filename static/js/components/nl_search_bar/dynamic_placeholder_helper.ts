/**
 * Copyright 2025 Google LLC
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
 * Helper class for enabling dynamic placeholders without muddying the AutoCompleteInput component.
 */
import { defineMessages } from "react-intl";

const TYPING_SPEED = 40; // milliseconds per character
const TYPING_SPEED_DELETE = 20; // milliseconds per character
const DISPLAY_DURATION_DELAY = 3000;
const MAX_SAMPLE_QUESTION_CYCLE = 5;

export const placeholderMessages = defineMessages({
  trySearchingPlaceholder: {
    id: "try_searching_placeholder",
    defaultMessage: 'Try searching "{sampleQuestion}"',
    description:
      "Used for the dynamic placeholders in the search bar, gives an example of a query to type.",
  },
});

export const enableDynamicPlacehoder = (
  setSampleQuestionText: (arg0: any) => void,
  setDynamicPlaceholdersEnabled: (arg0: any) => void
): void => {
  const sampleQuestions = loadSampleQuestions();
  if (sampleQuestions.length == 0) {
    return;
  }

  const sampleQuestionStartIndex = Math.floor(
    Math.random() * sampleQuestions.length
  );

  // Add a 5-second delay before starting the cycle
  const timerId = setTimeout(() => {
    setDynamicPlaceholdersEnabled(true);
    cycleSampleQuestions(
      sampleQuestions,
      sampleQuestionStartIndex,
      0,
      setSampleQuestionText,
      setDynamicPlaceholdersEnabled
    );
  }, 5000);

  (): void => clearTimeout(timerId);
};
export const loadSampleQuestions = (): string[] => {
  const metadataContainer = document.getElementById("metadata-base");
  const sampleQuestions = metadataContainer?.dataset?.sampleQuestions
    ? JSON.parse(metadataContainer.dataset.sampleQuestions).flatMap(
        (category) => category.questions
      ) ?? []
    : [];
  return sampleQuestions;
};

/* Start typing the sample questions through the Input's placeholder attribute while inactive. */
export const cycleSampleQuestions = (
  sampleQuestions: string[],
  index: number,
  questionCount: number,
  setSampleQuestionText: (arg0: any) => void,
  setDynamicPlaceholdersEnabled: (arg0: any) => void
): void => {
  if (questionCount >= MAX_SAMPLE_QUESTION_CYCLE) {
    setSampleQuestionText("");
    setDynamicPlaceholdersEnabled(false);
    return;
  }

  const currentQuestion = sampleQuestions[index];
  let charIndex = 0;

  const typeNextChar = () => {
    if (charIndex <= currentQuestion.length) {
      setSampleQuestionText(currentQuestion.substring(0, charIndex++));
      setTimeout(typeNextChar, TYPING_SPEED);
    } else {
      setTimeout(() => {
        const deleteChar = (): void => {
          if (charIndex >= 0) {
            setSampleQuestionText(currentQuestion.substring(0, charIndex--));
            setTimeout(deleteChar, TYPING_SPEED_DELETE);
          } else {
            const nextQuestionIndex = (index + 1) % sampleQuestions.length;
            cycleSampleQuestions(
              sampleQuestions,
              nextQuestionIndex,
              ++questionCount,
              setSampleQuestionText,
              setDynamicPlaceholdersEnabled
            );
          }
        };
        deleteChar();
      }, DISPLAY_DURATION_DELAY);
    }
  };
  typeNextChar();
};
