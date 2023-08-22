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

import React, { useEffect, useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";

export interface TextTilePropType {
  // API root for data fetch
  apiRoot?: string;
  // number of characters of text body to show before "show more"
  characterLimit?: number;
  // Override for the heading to display with the text
  heading?: string;
  // Override for the text body to display
  text?: string;
  // Whether to show entire story regardless of character limit
  showFullText?: boolean;
  // DCID of the node to get a text annotation for
  node: string;
}

interface TextTileData {
  heading: string;
  text: string;
}

// Default number of characters of text body to show before "show more".
const DEFAULT_STORY_CHARACTER_LIMIT = 250;

export function TextTile(props: TextTilePropType): JSX.Element {
  const [textTileData, setTextTileData] = useState<TextTileData | undefined>(
    null
  );
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    fetchData(props).then((data) => {
      setTextTileData(data);
    });
  }, [props]);

  if (!textTileData) {
    return null;
  }

  const characterLimit = props.characterLimit || DEFAULT_STORY_CHARACTER_LIMIT;

  return (
    <div
      className={`chart-container story-tile ${ASYNC_ELEMENT_HOLDER_CLASS}`}
      {...{ part: "container" }}
    >
      {textTileData && (
        <>
          <div className="story-title">{textTileData.heading}</div>
          <div className={`story-body${showMore ? "" : " fade-text"}`}>
            {showMore || props.showFullText
              ? textTileData.text
              : `${textTileData.text.substring(0, characterLimit)}...`}
          </div>
          {!props.showFullText && (
            <div
              className="show-more-toggle"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Show less" : "Show more"}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const fetchData = (props: TextTilePropType): Promise<TextTileData> => {
  const heading = `Sample Title for ${props.node}'s Story Here`;
  const text = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
  eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
  veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
  commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit
  esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
  non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
  doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
  veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
  ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
  consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque
  porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,
  adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et
  dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis
  nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid
  ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea
  voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem
  eum fugiat quo voluptas nulla pariatur?`;
  return Promise.resolve({ heading, text });
};
