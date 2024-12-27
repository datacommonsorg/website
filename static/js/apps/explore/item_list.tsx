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
 * Component for rendering the sidebar of a subject page.
 */

import React, { ReactElement } from "react";

export interface Item {
  text: string;
  url: string;
}

interface ItemListPropType {
  items: Item[];
}

export function ItemList(props: ItemListPropType): ReactElement {
  return (
    <div className="item-list-container">
      <div className="item-list-inner">
        {props.items.map((item, idx) => {
          return (
            <div key={idx} className="item-list-item">
              <a className="item-list-text" href={item.url}>
                {item.text}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
