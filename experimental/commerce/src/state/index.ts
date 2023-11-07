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
import { WEB_API_ENDPOINT } from "../utils/constants";
import DataCommonsClient from "../utils/DataCommonsClient";
import { FulfillResponse } from "../utils/types";

export const dataCommonsClient = new DataCommonsClient({
  apiRoot: WEB_API_ENDPOINT,
});

export interface AppModel {
  // Cache responses from /fulfill endpoint
  fulfillments: {
    byId: {
      [key: string]: FulfillResponse;
    };
  };
}

/**
 * State mutation actions
 */
export interface AppActions {
  // Actions (these manipulate state directly)
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
  fulfillments: {
    byId: {},
  },
};

/**
 * State mutation actions
 */
const appActions: AppActions = {
  initializeAppState: thunk(async () => {
    // Placeholder for initializing app store
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
