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

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useEffect, useState } from "react";

import { GA_EVENT_HOMEPAGE_CLICK } from "../../shared/ga_events";
import { BREAKPOINTS } from "../../shared/hooks/breakpoints";
import { SampleQuestionCategory } from "../../shared/types/homepage";
import { Link, LinkBox } from "../elements/link_box";
import SlideCarousel from "../elements/slide_carousel";

interface SampleQuestionsProps {
  sampleQuestions: SampleQuestionCategory[];
}

const colors: ("green" | "blue" | "red" | "yellow" | "grey")[] = [
  "green",
  "blue",
  "red",
  "yellow",
  "grey",
];

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

  const theme = useTheme();

  useEffect(() => {
    const handleResize = (): void => {
      setColumnsPerSlide(calculateColumnsPerSlide());
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const sampleQuestionToLink = (sampleQuestion: string): Link => ({
    id: sampleQuestion,
    title: sampleQuestion,
    url: `/explore#q=${encodeURIComponent(sampleQuestion)}`,
  });

  const createSlides = (): ReactElement[] => {
    const slides: ReactElement[] = [];

    for (let i = 0; i < sampleQuestions.length; i += columnsPerSlide) {
      slides.push(
        <div
          css={css`
            display: flex;
            gap: ${theme.spacing.lg}px;
            margin-bottom: ${theme.spacing.lg}px;
            padding: ${theme.spacing.xs}px;
          `}
          key={i}
        >
          {sampleQuestions
            .slice(i, i + columnsPerSlide)
            .map((category, index) => {
              const overallIndex = i + index;

              return (
                <div
                  key={category.category}
                  css={css`
                    display: flex;
                    flex-basis: 100%;
                    flex-grow: 1;
                    flex-shrink: 1;
                    flex-direction: column;
                    gap: ${theme.spacing.lg}px;
                  `}
                >
                  {category.questions.map((question) => (
                    <LinkBox
                      key={question}
                      link={sampleQuestionToLink(question)}
                      color={colors[overallIndex % colors.length]}
                      section={`sample-q ${index}-${overallIndex}`}
                      category={category.category}
                    />
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
      <div
        css={css`
          display: flex;
          gap: ${theme.spacing.lg}px;
          margin-bottom: ${theme.spacing.lg}px;
          padding: ${theme.spacing.xs}px;
        `}
      >
        <div
          css={css`
            display: flex;
            flex-basis: 100%;
            flex-grow: 1;
            flex-shrink: 1;
            flex-direction: column;
            gap: ${theme.spacing.lg}px;
          `}
        >
          {sampleQuestions.map((category, index) => {
            const question = getRandomQuestionFromCategory(category);
            return (
              <LinkBox
                key={question}
                link={sampleQuestionToLink(question)}
                color={colors[index % colors.length]}
                section={`sample-q ${index}-single`}
                category={category.category}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const slides = createSlides();
  return (
    <>
      <header
        css={css`
          margin-bottom: ${theme.spacing.lg}px;
        `}
      >
        <h3
          css={css`
            ${theme.typography.heading.xs}
          `}
        >
          Sample questions
        </h3>
      </header>
      {columnsPerSlide === 1 ? (
        createSingleColumnLayout()
      ) : (
        <SlideCarousel slides={slides} gaEvent={GA_EVENT_HOMEPAGE_CLICK} />
      )}
    </>
  );
};

export default SampleQuestions;
