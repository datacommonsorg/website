/**
 * Copyright 2022 Google LLC
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
 * Chip component to display a selected item with the ability to remove the item
 */

import React from "react";

interface ChipPropsType {
  // Id of the item the chip is being shown for
  id: string;
  // Title to show in the chip
  title: string;
  // Callback function when chip is removed
  removeChip: (id: string) => void;
  // Color of the chip
  color?: string;
  // When chip text is clicked
  onTextClick?: () => void;
}

export function Chip(props: ChipPropsType): JSX.Element {
  // TODO: clean up class names - don't need to maintain mdl-chip naming
  return (
    <div
      className="mdl-chip mdl-chip--deletable"
      style={props.color ? { backgroundColor: props.color } : {}}
    >
      <span
        className={`mdl-chip__text ${
          props.onTextClick && "mdl-chip__text_clickable"
        }`}
        onClick={() => {
          if (props.onTextClick) {
            props.onTextClick();
          }
        }}
      >
        {props.title}
      </span>
      <button className="mdl-chip__action">
        <i
          className="material-icons"
          onClick={() => props.removeChip(props.id)}
        >
          cancel
        </i>
      </button>
    </div>
  );
}
