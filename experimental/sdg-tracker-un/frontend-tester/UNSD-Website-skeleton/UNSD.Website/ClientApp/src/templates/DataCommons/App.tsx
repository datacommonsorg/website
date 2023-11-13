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
import { useLocation } from "react-router-dom";
import Countries from "./components/countries/Countries";
import Goals from "./components/goals/Goals";
import Home from "./components/home/Home";
import Search from "./components/search/Search";
import Topics from "./components/topics/Topics";
import { store, useStoreActions } from "./state";

// @ts-ignore
import "./App.css";

function App() {
  const location = useLocation();
  let component = null;
  const pathname = location?.pathname || "";
  if (pathname.endsWith("countries")) {
    component = <Countries />;
  } else if (pathname.endsWith("goals")) {
    component = <Goals />;
  } else if (pathname.endsWith("topics")) {
    component = <Topics />;
  } else if (pathname.endsWith("search")) {
    component = <Search />;
  } else {
    component = <Home />;
  }

  return (
    <StoreProvider store={store}>
      <InitializeStore />
      {component}
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
