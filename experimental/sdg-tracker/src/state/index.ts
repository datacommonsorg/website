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
 * Global state management.
 */
import {
  Action,
  action,
  createStore,
  createTypedHooks,
  Thunk,
  thunk,
} from "easy-peasy";
import React, { ReactNode } from "react";
import styled from "styled-components";
import countries from "../config/countries.json";
import rootTopics from "../config/rootTopics.json";
import sidebarConfig from "../config/sidebar.json";
import { WEB_API_ENDPOINT } from "../utils/constants";
import DataCommonsClient from "../utils/DataCommonsClient";
import { FulfillResponse } from "../utils/types";

export const dataCommonsClient = new DataCommonsClient({
  apiRoot: WEB_API_ENDPOINT,
});

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
 * Data commons topic
 */
export interface Topic {
  name: string;
  dcid: string;
  parentDcids: string[];
}

/**
 * MenuItem type for holding variable egroups
 */

export interface MenuItemType {
  key: string;
  label: string;
  icon?: ReactNode;
  children?: MenuItemType[];
  parents: string[];
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
  topics: {
    byDcid: {
      [dcid: string]: Topic;
    };
  };
  // Cache responses from /fulfill endpoint
  fulfillments: {
    byId: {
      [key: string]: FulfillResponse;
    };
  };
  sidebarMenuHierarchy: MenuItemType[];
  rootTopics: RootTopic[];
}

/**
 * State mutation actions
 */
export interface AppActions {
  // Actions (these manipulate state directly)
  setTopics: Action<AppModel, Topic[]>;
  setRootTopics: Action<AppModel, RootTopic[]>;
  setSidebarMenuHierarchy: Action<AppModel, MenuItemType[]>;
  setCountries: Action<AppModel, Place[]>;
  setRegions: Action<AppModel, Place[]>;
  setFulfillment: Action<
    AppModel,
    { key: string; fulfillment: FulfillResponse }
  >;

  // Thunks (async methods that do not manipulate the state directly)
  fetchTopicFulfillment: Thunk<
    AppActions,
    {
      entityDcids: string[];
      fulfillmentsById: {
        [key: string]: FulfillResponse;
      };
      variableDcids: string[];
    }
  >;
  initializeAppState: Thunk<AppActions>;
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
  topics: {
    byDcid: {},
  },
  fulfillments: {
    byId: {},
  },
  rootTopics: [],
  sidebarMenuHierarchy: [],
};

/**
 * State mutation actions
 */
const appActions: AppActions = {
  initializeAppState: thunk(async (actions) => {
    actions.setRootTopics(rootTopics);
    actions.setRegions(countries.regions);
    actions.setCountries(
      countries.countries.filter((c) => c.is_un_member_or_observer)
    );
    actions.setSidebarMenuHierarchy(
      sidebarConfig.map((item) => ({
        ...item,
        icon: React.createElement(MenuImageIcon, {
          src: item.icon,
        }),
      }))
    );
    const topics: Topic[] = [];
    const traverseTopics = (item: MenuItemType) => {
      if (!item.key.startsWith("dc")) {
        return;
      }
      topics.push({
        dcid: item.key,
        name: item.label,
        parentDcids: item.parents,
      });
      item.children &&
        item.children.forEach((childItem) => traverseTopics(childItem));
    };
    sidebarConfig.forEach((item) => traverseTopics(item));
    actions.setTopics(topics);
  }),

  fetchTopicFulfillment: thunk(
    async (actions, { entityDcids, fulfillmentsById, variableDcids }) => {
      const fulfillKey = [
        ...[...entityDcids].sort(),
        ...[...variableDcids].sort(),
      ].join(",");
      if (fulfillKey in fulfillmentsById) {
        return fulfillmentsById[fulfillKey];
      }
      const fulfillment = await dataCommonsClient.fulfill({
        dc: "sdg",
        entities: entityDcids,
        variables: variableDcids,
        childEntityType: "",
        comparisonEntities: [],
        comparisonVariables: [],
      });
      actions.setFulfillment({
        key: fulfillKey,
        fulfillment,
      });
      return fulfillment;
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
  setTopics: action((state, topics) => {
    state.topics.byDcid = {};
    topics.forEach((t) => {
      state.topics.byDcid[t.dcid] = t;
    });
  }),
  setRootTopics: action((state, rootTopics) => {
    state.rootTopics = [...rootTopics];
  }),
  setSidebarMenuHierarchy: action((state, items) => {
    state.sidebarMenuHierarchy = [...items];
  }),
  setFulfillment: action((state, { key, fulfillment }) => {
    state.fulfillments.byId[key] = { ...fulfillment };
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
