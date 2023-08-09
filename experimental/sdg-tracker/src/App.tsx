import { StoreProvider } from "easy-peasy";
import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Country from "./components/country/Country";
import Global from "./components/global/Global";
import Home from "./components/home/Home";
import { store, useStoreActions } from "./state";

function App() {
  return (
    <StoreProvider store={store}>
      <InitializeStore />
      <HashRouter>
        <Routes>
          <Route path="/" Component={Home} />
          <Route path="/global" Component={Global} />
          <Route path="/country/:countryCode?" Component={Country} />
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
