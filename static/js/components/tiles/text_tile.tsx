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
 * Component for rendering a text tile.
 */

import React, { useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";

export interface TextTilePropType {
  // number of characters of text body to show before "show more"
  characterLimit?: number;
  // Heading to display with the text
  heading: string;
  // Text body to display
  text: string;
  // Whether to show entire story regardless of character limit
  showFullText?: boolean;
}

// Default number of characters of text body to show before "show more".
const DEFAULT_STORY_CHARACTER_LIMIT = 250;

/**
 * Formats text into paragraphs within <p> tags
 */
function formatText(text: string): JSX.Element[] {
  return text
    .replaceAll(/\\n/g, "\n") // Catch "\n" as text instead of newline character
    .split(/\r?\n/) // Split into paragraphs by newline character
    .map((item, i) => <p key={i}>{item}</p>); // wrap each paragraph in a tag
}

export function TextTile(props: TextTilePropType): JSX.Element {
  const [showMore, setShowMore] = useState(false);

  if (!(props.heading && props.text)) {
    return null;
  }

  const characterLimit = props.characterLimit || DEFAULT_STORY_CHARACTER_LIMIT;
  const shouldShowFullText =
    props.showFullText || props.text.length <= characterLimit;
  const fullTextBody = formatText(props.text);
  const shortTextBody = formatText(props.text.substring(0, characterLimit));

  return (
    <div
      className={`chart-container text-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      {...{ part: "container" }}
    >
      <div className="text-header" {...{ part: "heading" }}>
        {props.heading}
      </div>
      <div
        className={`text-body${
          showMore || shouldShowFullText ? "" : " fade-text"
        }`}
        {...{ part: "text" }}
      >
        {showMore || shouldShowFullText ? fullTextBody : shortTextBody}
      </div>
      {!shouldShowFullText && (
        <div
          className="show-more-toggle"
          onClick={() => setShowMore(!showMore)}
          {...{ part: "show-more-toggle" }}
        >
          {showMore ? "Show less" : "Show more"}
        </div>
      )}
    </div>
  );
}
