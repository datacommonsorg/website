import "bootstrap/dist/css/bootstrap.css";
import Country from "components/country/Country";
import World from "components/world/World";
import { useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import DatacommonsClient from "utils/DatacommonsClient";
import { DatacommonsClientContext } from "utils/context";

function App() {
  const [datacommonsClient] = useState(new DatacommonsClient({}));
  return (
    <DatacommonsClientContext.Provider value={datacommonsClient}>
      <HashRouter>
        <Routes>
          <Route path="/" Component={World} />
          <Route path="/country/:countryCode?" Component={Country} />
        </Routes>
      </HashRouter>
    </DatacommonsClientContext.Provider>
  );
}

export default App;
