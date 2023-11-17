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
 * Component that shows items in a carousel.
 */

import React, { useState } from "react";

interface CarouselItem {
  id: string;
  url: string;
  title: string;
  imgUrl: string;
}

interface CarouselPropType {
  items: CarouselItem[];
}

export function Carousel(props: CarouselPropType): JSX.Element {
  const [idxStart, setIdxStart] = useState(0);
  const orderedItems = props.items.slice(idxStart);
  let idx = 0;
  while (idx < idxStart) {
    orderedItems.push(props.items[idx]);
    idx++;
  }

  return (
    <div className="carousel-container">
      <div className="carousel-items">
        {orderedItems.map((item) => {
          return (
            <a
              key={item.id}
              href={item.url}
              className="carousel-item-container"
            >
              <span>{item.title}</span>
              <div className="image-container">
                <img src={item.imgUrl} alt="image" />
              </div>
            </a>
          );
        })}
      </div>
      <div
        onClick={() => setIdxStart((idxStart + 1) % props.items.length)}
        className="navigation-button"
      >
        <span className="material-icons-outlined">navigate_next</span>
      </div>
    </div>
  );
}
