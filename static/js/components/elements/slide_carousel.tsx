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
 * A slide-based carousel that takes arbitrary ReactElements as slides
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  triggerGAEvent,
} from "../../shared/ga_events";
import { Wrapper } from "../elements/layout/wrapper";

interface SlideCarouselProps {
  //an array of ReactElements, each of which will be a slide in the carousel
  slides: ReactElement[];
  //an optional autoslide interval - if set, the carousel will slide automatically at that interval until the user interacts with it
  autoslideInterval?: number | null;
}

const SlideCarousel = ({
  slides,
  autoslideInterval,
}: SlideCarouselProps): ReactElement => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const theme = useTheme();

  const goToSlide = (index: number): void => {
    setIsInteracting(true);
    setActiveIndex(index);
    // TODO: Pass in GA event so the component can be used on other pages.
    triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
      [GA_PARAM_ID]: `carousel ${index}`,
    });
  };

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(slides.length - 1);
    }
  }, [slides.length, activeIndex]);

  useEffect(() => {
    if (autoslideInterval && !isInteracting) {
      const interval = setInterval(() => {
        setActiveIndex((prevIndex) => (prevIndex + 1) % slides.length);
      }, autoslideInterval);
      return () => clearInterval(interval);
    }
  }, [autoslideInterval, slides.length, activeIndex, isInteracting]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent): void => {
      if (carouselRef.current) {
        const focusedElement = event.target as HTMLElement;

        const slideIndex = Array.from(
          carouselRef.current.querySelectorAll(".carousel-slide")
        ).findIndex((slide) => slide.contains(focusedElement));

        if (slideIndex !== -1 && slideIndex !== activeIndex) {
          setActiveIndex(slideIndex);
        }

        const innerCarousel = carouselRef.current?.querySelector(
          ".carousel-inner"
        ) as HTMLElement;
        if (innerCarousel) {
          innerCarousel.scrollLeft = 0;
        }
      }
    };

    const carouselElement = carouselRef.current;
    if (carouselElement) {
      carouselElement.addEventListener("focusin", handleFocusIn);
    }

    return () => {
      if (carouselElement) {
        carouselElement.removeEventListener("focusin", handleFocusIn);
      }
    };
  }, [activeIndex]);

  return (
    <div
      className="slide-carousel"
      ref={carouselRef}
      css={css`
        position: relative;
        width: 100%;
        overflow: hidden;
      `}
    >
      <div
        className="carousel-inner"
        css={css`
          position: relative;
          width: 100%;
          overflow: hidden;
        `}
      >
        <div
          className="carousel-tape"
          css={css`
            display: flex;
            transition: transform 0.5s ease;
            transform: translateX(-${(activeIndex * 100) / slides.length}%);
            width: ${slides.length * 100}%;
            display: flex;
            transition: transform 0.5s ease;
          `}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className="carousel-slide"
              css={css`
                width: calc(100% / ${slides.length});
                flex-shrink: 0;
              `}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div
          className="carousel-dots-wrapper"
          css={css`
            display: flex;
            justify-content: center;
            width: 100%;
            padding-top: ${theme.spacing.md}px;
          `}
        >
          <ul
            className="carousel-dots"
            css={css`
              display: flex;
              gap: ${theme.spacing.md}px;
              margin: 0;
              padding: 0;
            `}
          >
            {slides.map((_, index) => (
              <li
                key={index}
                className={`carousel-dot ${
                  index === activeIndex ? "active" : ""
                }`}
                onClick={(): void => goToSlide(index)}
                css={css`
                  display: inline-block;
                  width: 10px;
                  height: 10px;
                  background: white;
                  border: 1px solid ${theme.colors.link.primary.base};
                  border-radius: 50%;
                  cursor: pointer;
                  &.active {
                    background: ${theme.colors.link.primary.base};
                  }
                `}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SlideCarousel;
