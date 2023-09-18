This file is a React component that represents a dynamic template for displaying text and widget components. 

- **State Management**: The component uses the `useState` hook from React to manage state. It initializes the `mode`` state variable with the initial value of "left", which controls the position of the tabs.

- **Event Handling**: The component defines an event handler function `handleModeChange`, which is used to update the `mode` state variable when the user selects a different tab position.

- **JSX Rendering**: The component renders a series of JSX elements to create the UI. The structure includes a Breadcrumb, a header, buttons for selecting the tab position, and a set of tabs displaying information related to each SDG.

- **Tabs**: The component uses the `Tabs` component from *Ant Design* to create a set of tabs. Each tab represents one of the Sustainable Development Goals (SDGs). The tabs are labeled with the SDG's icon and name. When a tab is clicked, the content associated with that SDG is displayed.

- **Content**: The content for each tab is dynamically fetched and populated using the `DataCommonsSdgBody` component, based on the `Id` prop passed to it.

- **Styling**: Some inline styling is used to adjust the appearance of certain elements, such as the width of the SDG icon and name displayed in the tabs.