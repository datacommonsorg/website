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

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_QUERY,
  triggerGAEvent,
} from "../../shared/ga_events";
import { BREAKPOINTS } from "../../shared/hooks/breakpoints";
import { SampleQuestionCategory } from "../../shared/types/homepage";
import { Wrapper } from "../elements/layout/wrapper";
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
                    <div
                      key={question}
                      className={`${colors[overallIndex % colors.length]}`}
                      css={css`
                        display: block;
                        list-style: none;
                        &.green a {
                          p {
                            color: ${theme.colors.box.green.text};
                          }
                          small {
                            color: ${theme.colors.box.green.tag};
                            background-color: ${theme.colors.box.green.pill};
                          }
                        }
                        &.blue a {
                          p {
                            color: ${theme.colors.box.blue.text};
                          }
                          small {
                            color: ${theme.colors.box.blue.tag};
                            background-color: ${theme.colors.box.blue.pill};
                          }
                        }
                        &.red a {
                          p {
                            color: ${theme.colors.box.red.text};
                          }
                          small {
                            color: ${theme.colors.box.red.tag};
                            background-color: ${theme.colors.box.red.pill};
                          }
                        }
                        &.yellow a {
                          p {
                            color: ${theme.colors.box.yellow.text};
                          }
                          small {
                            color: ${theme.colors.box.yellow.tag};
                            background-color: ${theme.colors.box.yellow.pill};
                          }
                        }
                        &.gray a {
                          p {
                            color: ${theme.colors.box.gray.text};
                          }
                          small {
                            color: ${theme.colors.box.gray.tag};
                            background-color: ${theme.colors.box.gray.pill};
                          }
                        }
                      `}
                    >
                      <a
                        href={`/explore#q=${encodeURIComponent(question)}`}
                        onClick={(): void => {
                          triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                            [GA_PARAM_ID]: `sample-q ${index}-${overallIndex}`,
                            [GA_PARAM_QUERY]: question,
                          });
                        }}
                        css={css`
                          ${theme.box.primary}
                          ${theme.elevation.primary}
                          ${theme.radius.primary}
                          display: flex;
                          flex-direction: column;
                          align-items: flex-start;
                          gap: ${theme.spacing.sm}px;
                          padding: ${theme.spacing.lg}px;
                          &:hover {
                            text-decoration: none;
                          }
                        `}
                      >
                        <p
                          css={css`
                            ${theme.typography.text.xl}
                          `}
                        >
                          {question}
                        </p>
                        <small
                          css={css`
                            ${theme.typography.text.xs}
                            ${theme.radius.secondary}
                          display: inline-block;
                            padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
                          `}
                        >
                          {category.category}
                        </small>
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
              <div
                key={category.category}
                className={`${colors[index % colors.length]}`}
                css={css`
                  display: block;
                  list-style: none;
                  &.green a {
                    p {
                      color: ${theme.colors.box.green.text};
                    }
                    small {
                      color: ${theme.colors.box.green.tag};
                      background-color: ${theme.colors.box.green.pill};
                    }
                  }
                  &.blue a {
                    p {
                      color: ${theme.colors.box.blue.text};
                    }
                    small {
                      color: ${theme.colors.box.blue.tag};
                      background-color: ${theme.colors.box.blue.pill};
                    }
                  }
                  &.red a {
                    p {
                      color: ${theme.colors.box.red.text};
                    }
                    small {
                      color: ${theme.colors.box.red.tag};
                      background-color: ${theme.colors.box.red.pill};
                    }
                  }
                  &.yellow a {
                    p {
                      color: ${theme.colors.box.yellow.text};
                    }
                    small {
                      color: ${theme.colors.box.yellow.tag};
                      background-color: ${theme.colors.box.yellow.pill};
                    }
                  }
                  &.gray a {
                    p {
                      color: ${theme.colors.box.gray.text};
                    }
                    small {
                      color: ${theme.colors.box.gray.tag};
                      background-color: ${theme.colors.box.gray.pill};
                    }
                  }
                `}
              >
                <a
                  href={`/explore#q=${encodeURIComponent(question)}`}
                  onClick={(): void => {
                    triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                      [GA_PARAM_ID]: `sample-q ${index}-single`,
                      [GA_PARAM_QUERY]: question,
                    });
                  }}
                  css={css`
                    ${theme.box.primary}
                    ${theme.elevation.primary}
                    ${theme.radius.primary}
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: ${theme.spacing.sm}px;
                    padding: ${theme.spacing.lg}px;
                  `}
                >
                  <p
                    css={css`
                      ${theme.typography.text.xl}
                    `}
                  >
                    {question}
                  </p>
                  <small
                    css={css`
                      ${theme.typography.text.xs}
                      ${theme.radius.secondary}
                      display: inline-block;
                      padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
                    `}
                  >
                    {category.category}
                  </small>
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
    <Wrapper variant="compact">
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
        <SlideCarousel slides={slides} />
      )}
    </Wrapper>
  );
};

export default SampleQuestions;
