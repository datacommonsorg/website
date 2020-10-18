/**
 * Copyright 2020 Google LLC
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

import React, { useContext } from "react";
import _ from "lodash";
import { Menu } from "../statsvar_menu";
import { NoopStatsVarFilter } from "../commons";
import { ScatterContext } from "./scatter2_app";

function StatVarChooser(): JSX.Element {
  const context = useContext(ScatterContext);
  const selected = { ...context.statVarX.value, ...context.statVarY.value };

  function addStatVar(
    statVar: string,
    nodePath: string[],
    denominators?: string[]
  ) {
    const node = {
      [statVar]: { paths: [nodePath], denominators: denominators },
    };
    if (_.isEmpty(context.statVarX.value)) {
      context.statVarX.set(node);
    } else if (_.isEmpty(context.statVarY.value)) {
      context.statVarY.set(node);
    } else {
      // TODO: Pop up.
    }
  }

  function removeStatVar(statVar: string) {
    if (_.keys(context.statVarX.value)[0] === statVar) {
      context.statVarX.set({});
    } else if (_.keys(context.statVarY.value)[0] === statVar) {
      context.statVarY.set({});
    } else {
      // TODO: Error.
    }
  }

  return (
    <div className="explore-menu-container" id="explore">
      <div id="drill-scroll-container">
        <div className="title">Select variables:</div>
        <Menu
          selectedNodes={selected}
          // TODO: Filter by places.
          statsVarFilter={new NoopStatsVarFilter()}
          setStatsVarTitle={(input) => {
            console.log("setStatsVarTitle");
            console.log(input.toString());
          }}
          addStatsVar={addStatVar}
          removeStatsVar={removeStatVar}
        ></Menu>
      </div>
    </div>
  );
}

export { StatVarChooser };
