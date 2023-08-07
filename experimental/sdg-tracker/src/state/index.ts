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
 * Glboal state management.
 */
import {
  Action,
  action,
  createStore,
  createTypedHooks,
  Thunk,
  thunk,
} from "easy-peasy";

/**
 * Statistical variable grouping
 */
export interface VariableGroup {
  dcid: string;
  name: string;
  childGroupDcids: string[];
  childVariableDcids: string[];
  parentGroupDcids: string[];
  decendentVariableCount: string[];
}

/**
 * Statistical variable
 */
export interface Variable {
  dcid: string;
  name: string;
  searchNames: string[];
  parentGroupDcids: string[];
  definition: string;
}

/**
 * Definition of /config/sdgs.json
 */
export interface SdgConfig {
  variablesById: {
    [dcid: string]: Variable;
  };
  variableIds: string[];
  variableGroupsById: {
    [dcid: string]: VariableGroup;
  };
  variableGroupIds: string[];
}

export interface AppModel {
  // Normalized store of NL queries and contexts
  variables: {
    byDcid: {
      [dcid: string]: Variable;
    };
  };
  variableGroups: {
    byDcid: {
      [dcid: string]: VariableGroup;
    };
  };
  rootDcids: string[];
}

/**
 * State mutation actions
 */
export interface AppActions {
  // Actions (these manipulate state directly)
  setVariables: Action<AppModel, Variable[]>;
  setVariableGroups: Action<AppModel, VariableGroup[]>;
  setVariableGroupRootDcids: Action<AppModel, string[]>;

  // Thunks (async methods that do not manipulate the state directly)
  initializeAppState: Thunk<AppActions>;
}

/**
 * Initial application state
 */
const appModel: AppModel = {
  variables: {
    byDcid: {},
  },
  variableGroups: {
    byDcid: {},
  },
  rootDcids: [],
};

/**
 * State mutation actions
 */
const appActions: AppActions = {
  initializeAppState: thunk(async (actions) => {
    const response = await fetch("/config/sdgs.json");
    const sdgConfig = (await response.json()) as SdgConfig;
    actions.setVariables(
      sdgConfig.variableIds.map((dcid) => sdgConfig.variablesById[dcid])
    );
    actions.setVariableGroups(
      sdgConfig.variableGroupIds.map(
        (dcid) => sdgConfig.variableGroupsById[dcid]
      )
    );
    actions.setVariableGroupRootDcids([
      "dc/g/SDG_1",
      "dc/g/SDG_2",
      "dc/g/SDG_3",
      "dc/g/SDG_4",
      "dc/g/SDG_5",
      "dc/g/SDG_6",
      "dc/g/SDG_7",
      "dc/g/SDG_8",
      "dc/g/SDG_9",
      "dc/g/SDG_10",
      "dc/g/SDG_11",
      "dc/g/SDG_12",
      "dc/g/SDG_13",
      "dc/g/SDG_14",
      "dc/g/SDG_15",
      "dc/g/SDG_16",
      "dc/g/SDG_17",
    ]);
  }),
  setVariables: action((state, variables) => {
    variables.forEach((v) => {
      state.variables.byDcid[v.dcid] = v;
    });
  }),
  setVariableGroups: action((state, variableGroups) => {
    variableGroups.forEach((v) => {
      state.variableGroups.byDcid[v.dcid] = v;
    });
  }),
  setVariableGroupRootDcids: action((state, rootDcids) => {
    state.rootDcids = [...rootDcids];
  }),
};

/**
 * Build store and typed actions
 */
export type AppStore = AppModel & AppActions;
const applicationStore: AppStore = {
  ...appModel,
  ...appActions,
};
const store = createStore(applicationStore);
const { useStoreActions, useStoreState, useStoreDispatch, useStore } =
  createTypedHooks<AppStore>();
export { store, useStore, useStoreActions, useStoreDispatch, useStoreState };
