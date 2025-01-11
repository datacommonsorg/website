import { createContext, useContext } from "react";

type TabValue = string | number;

interface TabContextProps {
  //the currently selected tab index
  value: TabValue;
  //the function used to handle changing of the tab value
  onChange: (value: TabValue) => void;
}

export const TabContext = createContext<TabContextProps | undefined>(undefined);

export const useTabContext = (): TabContextProps => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("A Tab component must be used within a Tabs component");
  }
  return context;
};
