/**
 * Copyright 2021 Google LLC
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
import React from "react";

import { NamedTypedPlace } from "../shared/types";
import { randDomId } from "../shared/util";
import { Block, BlockPropType } from "./block";

export interface PageConfig {
  overviewBlock: BlockPropType;
  blocks: BlockPropType[];
}

interface MainPanePropType {
  /**
   * The place to show the page for.
   */
  place: NamedTypedPlace;
  /**
   * The topic of the current page.
   */
  topic: string;
  /**
   * Config of the page
   */
  pageConfig: PageConfig;
}

export function MainPane(props: MainPanePropType): JSX.Element {
  return (
    <>
      {props.pageConfig.blocks.map((block) => {
        const id = randDomId();
        return (
          <Block
            key={id}
            id={id}
            place={props.place}
            enclosedPlaceType={"State"}
            title={block.title}
            description={block.description}
            leftTiles={block.leftTiles}
            rightTiles={block.rightTiles}
            statVarMetadata={block.statVarMetadata}
          />
        );
      })}
    </>
  );
}
