import { createContext, useContext } from "react";

type TabValue = string | number;

interface TabsContextProps {
  //the currently selected tab index
  value: TabValue;
  //the function used to handle changing of the tab value
  onChange: (value: TabValue) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

export const useTabsContext = (): TabsContextProps => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("A Tab component must be used within a Tabs component");
  }
  return context;
};

export default TabsContext;
