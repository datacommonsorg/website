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

import React, { ReactElement, useEffect, useState } from "react";

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  triggerGAEvent,
} from "../../shared/ga_events";

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

  return (
    <div className="slide-carousel">
      <div className="carousel-inner">
        <div
          className="carousel-tape"
          style={{
            transform: `translateX(-${(activeIndex * 100) / slides.length}%)`,
            width: `${slides.length * 100}%`,
            display: "flex",
            transition: "transform 0.5s ease",
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className="carousel-slide"
              style={{
                width: `calc(100% / ${slides.length})`,
                flexShrink: 0,
              }}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="carousel-dots-wrapper">
          <ul className="carousel-dots">
            {slides.map((_, index) => (
              <li
                key={index}
                className={`carousel-dot ${
                  index === activeIndex ? "active" : ""
                }`}
                onClick={(): void => goToSlide(index)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SlideCarousel;
