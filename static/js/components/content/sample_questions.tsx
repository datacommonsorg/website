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

/**
 * A component to display clickable sample questions on a carousel for the homepage
 */

import React, { ReactElement, useEffect, useState } from "react";

import { BREAKPOINTS } from "../../apps/base/utilities/utilities";
import { SampleQuestionCategory } from "../../shared/types/homepage";
import SlideCarousel from "../elements/slide_carousel";

interface SampleQuestionsProps {
  sampleQuestions: SampleQuestionCategory[];
}

const colors = ["green", "blue", "red", "yellow", "gray"];

const calculateColumnsPerSlide = (): number => {
  if (window.innerWidth < BREAKPOINTS.sm) return 1;
  if (window.innerWidth < BREAKPOINTS.md) return 2;
  return 3;
};

const getRandomQuestionFromCategory = (
  category: SampleQuestionCategory
): string => {
  const randomIndex = Math.floor(Math.random() * category.questions.length);
  return category.questions[randomIndex];
};

const SampleQuestions = ({
  sampleQuestions,
}: SampleQuestionsProps): ReactElement => {
  const [columnsPerSlide, setColumnsPerSlide] = useState(() =>
    calculateColumnsPerSlide()
  );

  useEffect(() => {
    const handleResize = (): void => {
      setColumnsPerSlide(calculateColumnsPerSlide());
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const createSlides = (): ReactElement[] => {
    const slides: ReactElement[] = [];

    for (let i = 0; i < sampleQuestions.length; i += columnsPerSlide) {
      slides.push(
        <div className="questions-container" key={i}>
          {sampleQuestions
            .slice(i, i + columnsPerSlide)
            .map((category, index) => {
              const overallIndex = i + index;

              return (
                <div key={category.category} className="questions-column">
                  {category.questions.map((question) => (
                    <div
                      key={question}
                      className={`question-item ${
                        colors[overallIndex % colors.length]
                      }`}
                    >
                      <a href={`/explore#q=${encodeURIComponent(question)}`}>
                        <p>{question}</p>
                        <small>{category.category}</small>
                      </a>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      );
    }
    return slides;
  };

  const createSingleColumnLayout = (): ReactElement => {
    return (
      <div className="questions-container">
        <div className="questions-column">
          {sampleQuestions.map((category, index) => {
            const question = getRandomQuestionFromCategory(category);
            return (
              <div
                key={category.category}
                className={`question-item ${colors[index % colors.length]}`}
              >
                <a href={`/explore#q=${encodeURIComponent(question)}`}>
                  <p>{question}</p>
                  <small>{category.category}</small>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const slides = createSlides();

  return (
    <section id="sample-questions" className="sample-questions">
      <div className="container">
        <h3>Sample Questions</h3>
        {columnsPerSlide === 1 ? (
          createSingleColumnLayout()
        ) : (
          <SlideCarousel slides={slides} />
        )}
      </div>
    </section>
  );
};

export default SampleQuestions;
