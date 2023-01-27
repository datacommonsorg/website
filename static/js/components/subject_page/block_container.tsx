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
 * A container for blocks of all types.
 */

import React from "react";

export interface BlockContainerPropType {
  id: string;
  title?: string;
  description: string;
  children?: React.ReactNode;
}

export function BlockContainer(props: BlockContainerPropType): JSX.Element {
  return (
    <section
      className={`block subtopic ${props.title ? "" : "notitle"}`}
      id={props.id}
    >
      {props.title && <h3>{props.title}</h3>}
      {props.description && <p className="block-desc">{props.description}</p>}
      {props.children}
    </section>
  );
}
