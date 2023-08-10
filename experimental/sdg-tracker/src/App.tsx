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
import { StoreProvider } from "easy-peasy";
import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Countries from "./components/countries/Countries";
import Goals from "./components/goals/Goals";
import Home from "./components/home/Home";
import Search from "./components/search/Search";
import Topics from "./components/topics/Topics";
import { store, useStoreActions } from "./state";

function App() {
  return (
    <StoreProvider store={store}>
      <InitializeStore />
      <HashRouter>
        <Routes>
          <Route path="/" Component={Home} />
          <Route path="/countries/:dcid?" Component={Countries} />
          <Route path="/goals" Component={Goals} />
          <Route path="/topics" Component={Topics} />
          <Route path="/search" Component={Search} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}

const InitializeStore: React.FC = () => {
  const initializeAppState = useStoreActions((a) => a.initializeAppState);
  useEffect(() => {
    initializeAppState();
  }, []);
  return null;
};

export default App;
