import { StoreProvider } from "easy-peasy";
import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Explore from "./components/explore/Explore";
import Goals from "./components/goals/Goals";
import Home from "./components/home/Home";
import { store, useStoreActions } from "./state";

function App() {
  return (
    <StoreProvider store={store}>
      <InitializeStore />
      <HashRouter>
        <Routes>
          <Route path="/" Component={Home} />
          <Route path="/goals" Component={Goals} />
          <Route path="/explore/:dcid?" Component={Explore} />
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
