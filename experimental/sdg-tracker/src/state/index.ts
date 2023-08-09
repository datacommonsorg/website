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
import React from "react";
import styled from "styled-components";
import countries from "../config/countries.json";
import rootTopics from "../config/rootTopics.json";

/**
 * Regex for matching SDG variable group names
 * By convention, these names start with a number and end with a ":"
 * Examples: "1:", "1.1.1:", "8.1:"
 */
const sdgNameRegex = /^(\d\.?[^:]*)\:/;

const MenuImageIcon = styled.img`
  width: 2rem;
  height: 2rem;
  margin-right: 0.5rem;
  border-radius: 0.25rem;
`;

export interface Place {
  name: string;
  dcid: string;
}

/**
 * Root topic interface
 */
export interface RootTopic {
  name: string;
  description: string;
  groupDcid: string;
  topicDcid: string;
  iconUrl: string;
}

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
 * MenuItem type for holding variable egroups
 */

interface MenuItemType {
  key: string;
  label: string;
  children?: MenuItemType[];
}

/**
 * Definition of /config/variables.json
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
  countries: {
    byDcid: {
      [dcid: string]: Place;
    };
    dcids: string[];
  };
  regions: {
    byDcid: {
      [dcid: string]: Place;
    };
    dcids: string[];
  };
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
  variableGroupHierarchy: MenuItemType[];
  rootTopics: RootTopic[];
}

/**
 * State mutation actions
 */
export interface AppActions {
  // Actions (these manipulate state directly)
  setVariables: Action<AppModel, Variable[]>;
  setVariableGroups: Action<AppModel, VariableGroup[]>;
  setRootTopics: Action<AppModel, RootTopic[]>;
  setVariableGroupHierarchy: Action<AppModel, MenuItemType[]>;
  setCountries: Action<AppModel, Place[]>;
  setRegions: Action<AppModel, Place[]>;

  // Thunks (async methods that do not manipulate the state directly)
  initializeAppState: Thunk<AppActions>;
  initializeSdgHierarchy: Thunk<
    AppActions,
    {
      rootTopics: RootTopic[];
      variableGroupsByDcid: {
        [dcid: string]: VariableGroup;
      };
      variablesByDcid: {
        [dcid: string]: Variable;
      };
    }
  >;
}

/**
 * Initial application state
 */
const appModel: AppModel = {
  countries: {
    byDcid: {},
    dcids: [],
  },
  regions: {
    byDcid: {},
    dcids: [],
  },
  variables: {
    byDcid: {},
  },
  variableGroups: {
    byDcid: {},
  },
  rootTopics: [],
  variableGroupHierarchy: [],
};

/**
 * State mutation actions
 */
const appActions: AppActions = {
  initializeAppState: thunk(async (actions) => {
    const response = await fetch("/config/variables.json");
    const sdgConfig = (await response.json()) as SdgConfig;
    actions.setVariables(
      sdgConfig.variableIds.map((dcid) => sdgConfig.variablesById[dcid])
    );
    actions.setVariableGroups(
      sdgConfig.variableGroupIds.map(
        (dcid) => sdgConfig.variableGroupsById[dcid]
      )
    );
    actions.setRootTopics(rootTopics);
    actions.setRegions(countries.regions);
    actions.setCountries(countries.countries);
    await actions.initializeSdgHierarchy({
      rootTopics,
      variableGroupsByDcid: sdgConfig.variableGroupsById,
      variablesByDcid: sdgConfig.variablesById,
    });
  }),
  initializeSdgHierarchy: thunk(
    async (actions, { rootTopics, variableGroupsByDcid, variablesByDcid }) => {
      const traverse = (
        variableGroupDcid: string,
        summaryLevel?: string,
        iconUrl?: string
      ): any => {
        const variableGroup = variableGroupsByDcid[variableGroupDcid];

        const nextSummaryLevel = summaryLevel?.startsWith("Explore Goal")
          ? "Explore Target"
          : undefined;
        // We only want to include SDG goals and sub-goals in the hierarchy,
        // so filter variables & groups beyond that
        const children: MenuItemType[] = [
          ...variableGroup.childGroupDcids
            .filter((g) => sdgNameRegex.test(variableGroupsByDcid[g].name))
            .map((g, i) => {
              const vairableGroupNumber =
                variableGroupsByDcid[g].name.split(":")[0];
              return traverse(
                g,
                nextSummaryLevel
                  ? `${nextSummaryLevel} ${vairableGroupNumber}`
                  : undefined
              );
            }),
          ...variableGroup.childVariableDcids
            .map((variableDcid) => ({
              key: variableDcid,
              label: variablesByDcid[variableDcid].name,
            }))
            .filter((obj) => sdgNameRegex.test(obj.label)),
        ];
        // Custom sort for SDG names.
        // Avoids incorrect lexicographical sort orders like  "17.10, 17.11, 17.1, 17.2"
        children.sort((a, b) => {
          const aMatch = a.label.match(sdgNameRegex);
          const bMatch = b.label.match(sdgNameRegex);
          if (aMatch && bMatch) {
            const aParts = aMatch[1].split(".");
            const bParts = bMatch[1].split(".");
            for (let i = 0; i < aParts.length; i++) {
              if (i === bParts.length) {
                return -1;
              }
              if (aParts[i] !== bParts[i]) {
                aParts[i].localeCompare(bParts[i]);
                return Number(aParts[i]) - Number(bParts[i]);
              }
            }
          }
          return a.label.localeCompare(b.label);
        });
        if (summaryLevel) {
          children.unshift({
            key: `summary-${variableGroup.dcid}`,
            label: `${summaryLevel}`,
          });
        }

        const item = {
          key: variableGroupDcid,
          label: variableGroup.name,
          children: children.length > 0 ? children : undefined,
          _icon: iconUrl
            ? React.createElement(MenuImageIcon, {
                src: iconUrl,
              })
            : undefined,
          get icon() {
            return this._icon;
          },
          set icon(value) {
            this._icon = value;
          },
        };
        return item;
      };
      const items = rootTopics.map((rootTopic, i) =>
        traverse(
          rootTopic.groupDcid,
          `Explore Goal ${i + 1}`,
          rootTopic.iconUrl
        )
      );
      actions.setVariableGroupHierarchy(items);
    }
  ),
  setCountries: action((state, countries) => {
    state.countries.byDcid = {};
    state.countries.dcids = [];
    countries.forEach((country) => {
      state.countries.byDcid[country.dcid] = country;
      state.countries.dcids.push(country.dcid);
    });
  }),
  setRegions: action((state, regions) => {
    state.regions.byDcid = {};
    state.regions.dcids = [];
    regions.forEach((region) => {
      state.regions.byDcid[region.dcid] = region;
      state.regions.dcids.push(region.dcid);
    });

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
  setRootTopics: action((state, rootTopics) => {
    state.rootTopics = [...rootTopics];
  }),
  setVariableGroupHierarchy: action((state, items) => {
    state.variableGroupHierarchy = [...items];
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
