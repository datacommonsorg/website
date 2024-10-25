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
 * A component that renders a series of chips that function as links with titles
 */

import React, { ReactElement } from "react";

import {
  GA_EVENT_HOMEPAGE_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../shared/ga_events";

//an individual LinkChip comprising the title and url attributes of the chip.
export interface LinkChip {
  //a unique identifier for the chip (used for map keys)
  id: string;
  //the title of the chip - this will be the text of the link
  title: string;
  //the url of the chip link
  url: string;
}

interface LinkChipsProps {
  //the title of the component, displayed as a header above the chips
  title?: string;
  //the link
  linkChips: LinkChip[];
}

export const LinkChips = ({
  title,
  linkChips,
}: LinkChipsProps): ReactElement => {
  return (
    <section id="chip-section" className="chip-section">
      <div className="container">
        {title && <h3>{title}</h3>}
        <ul className="chip-container">
          {linkChips.map((linkChip) => (
            <li key={linkChip.id} className="chip-item">
              <a
                href={linkChip.url}
                onClick={(): void => {
                  triggerGAEvent(GA_EVENT_HOMEPAGE_CLICK, {
                    [GA_PARAM_ID]: `topic ${linkChip.id}`,
                    [GA_PARAM_URL]: linkChip.url,
                  });
                  window.location.href = linkChip.url;
                }}
              >
                <span className="material-icons-outlined">arrow_forward</span>
                {linkChip.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
