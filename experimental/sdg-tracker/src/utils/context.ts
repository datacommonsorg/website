import { createContext } from "react";
import DatacommonsClient from "./DatacommonsClient";

const datacommonsClient = new DatacommonsClient({});
export const DatacommonsClientContext = createContext<DatacommonsClient>(datacommonsClient);
