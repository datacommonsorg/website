/** @jsxImportSource @emotion/react */
import React, { ReactElement, ReactNode } from "react";

import TabsContext from "./TabsContext";

interface TabsProps {
  //the currently selected value, passed in to allow it to be controlled by outside state
  value: string | number;
  //the function to handle the changing of that value
  onChange: (value: string | number) => void;
  //the children, a <TabSet> followed by <TabPanels>
  children: ReactNode;
}

const Tabs = ({ value, onChange, children }: TabsProps): ReactElement => {
  return (
    <TabsContext.Provider
      value={{
        value,
        onChange,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
};

export default Tabs;
