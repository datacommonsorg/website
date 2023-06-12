import { HashRouter, Route, Routes } from "react-router-dom";
import World from "components/world/World";
import Country from "components/country/Country";
import "bootstrap/dist/css/bootstrap.css";
import { DatacommonsClientContext } from "utils/context";
import DatacommonsClient from "utils/DatacommonsClient";
import { useState } from "react";

function App() {
  const [datacommonsClient] = useState(new DatacommonsClient({}));
  return (
    <DatacommonsClientContext.Provider value={datacommonsClient}>
      <HashRouter>
        <Routes>
          <Route path="/" Component={World} />
          <Route path="/country" Component={Country} />
        </Routes>
      </HashRouter>
    </DatacommonsClientContext.Provider>
  );
}

export default App;
