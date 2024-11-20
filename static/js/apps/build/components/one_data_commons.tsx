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
 * A component to display the One Data Commons on the build page.
 * This is set as a carousel with the anticipation that more items
 * will be added. If we do not, it can be simplified.
 */

import React, { ReactElement } from "react";

import { MediaText } from "../../../components/content/media_text";
import SlideCarousel from "../../../components/elements/slide_carousel";

export const OneDataCommons = (): ReactElement => {
  const createSlides = (): ReactElement[] => {
    return [
      <MediaText
        key={0}
        imageAlt="One Data Commons Website Screenshot"
        mediaType="image"
        mediaSource="images/content/build/ONEData.png"
      >
        <p>
          <a
            href="https://datacommons.one.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ONE Data Commons
          </a>
          , a collaborative platform combining the in-depth data and research
          from the ONE Campaign with the vast repository of Google&rsquo;s Data
          Commons, offers unparalleled insights into global issues spanning
          economics, climate, health, demographics, and beyond.
        </p>
      </MediaText>,
    ];
  };

  const slides = createSlides();

  return (
    <>
      <header className="header">
        <h3>ONE Data Commons</h3>
      </header>
      <SlideCarousel slides={slides} />
    </>
  );
};
