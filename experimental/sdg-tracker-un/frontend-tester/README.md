# Project Overview

This project contains a minimum version of the UNSD Website, built using React and .NET Core. It serves as a testing ground for the integration of front-end components developed to displaying visualizations and other type of contents created for the SDG Data Commons project. 

Key files for testing Data Commons components are:
-  `ClientApp/public/index.html`
-  `ClientApp/src/templates/DataCommons/DataCommonsSDGTemplate.js`

## Project Structure

The project folder is organized as follows:
- UNSD.Website.sln
- **UNSD.Website/**: .NET Core application folder.
  - `appsettings.Development.json`, `appsettings.json`: Configuration files for .NET Core application used to specify logging settings and allowed hosts, and to specify different log levels for different log categories
  - `compilerconfig.json`, `compilerconfig.json.defaults`: Configuration files for the .NET compiler for generating CSS files from SCSS (Sass) files and for setting compiler and minifier options. 
  - `Program.cs`: Entry point for the .NET Core application. 
  - `Startup.cs`: Configuration and initialization for the .NET Core application.
  - `UNSD.Website.csproj`: Project file for the .NET Core application. The file contains various configuration settings and build targets related to the client-side part of the Single Page Application.
  - **.config/**: Contains the configuration file`dotnet-tools.json` specifying .NET Core CLI tools used in the project.
  - **ClientApp/**: The frontend application folder (React app).
    - `config-overrides.js`: Custom configuration that overrides the Webpack configuration to handle certain modules and dependencies in the browser environment
    - `package-lock.json`, `package.json`: NPM package files for managing frontend dependencies within the ClientApp folder.
    - **public/**: Public assets for the React app.
        - `index.html`: Sets up the basic configuration for the web app, including character encoding, viewport settings, security policies, and references to external resources like fonts. It also provides a fallback message for users without JavaScript support and prepares the DOM element for the dynamic content rendered by the web app.  **This includes https://datacommons.org/datacommons.js**
        - `manifest.json`: Provides the necessary configuration for the web app to function as a Progressive Web App
    - **src/**: The source code for the React frontend application.
      - `index.js`: Entry point for the React application.
      - `custom.css`, custom.min.css, custom.scss: Custom CSS styles for the application.
      - `custom_ar.css`, `custom_ar.min.css`, `custom_ar.scss`: Custom CSS styles for the application (Arabic).
      - `App.test.js`: Unit test written using the Jest testing framework for a React application. The purpose of this test is to check if the main component of the application, represented by the App component, renders without crashing.
      - `ocr-a_regular-webfont.woff`, `ocr-a_regular-webfront.woff2`: Font files
      - `registerServiceWorkers.js`: This file manages the registration and handling of a service worker for the web application in production, providing offline capabilities and caching assets for faster loading.
      - `withTracker.js`: This file exports a Higher Order Component (HOC) that integrates Google Analytics tracking for React components, automatically recording page views and updates when a user navigates between different pages.
      - **components/**: React components used in the application's user interface.
        - `Layout.js`: Layout component for the web application that includes a navigation menu and a container to wrap the content of its child components.
        - `Footer.js`, `Home.js`, `Header.js`
        - **atom/**: Atomic components, the smallest building blocks.
        - **molecule/**: Molecule components, composed of atomic components.
        - **organism/**: Organism components, composed of molecule components.
      - **containers/**: Higher-level container components.
        - `Language.js`: A container component for language selection.  This component provides a language context to the app, allowing it to switch between different language options using a language dropdown, and dynamically loads different language JSON files based on the selected language to display text content in the desired language throughout the application. It also supports loading RTL (Right-to-Left) themes for certain languages.
      - **helper/**: Utility and common helper functions.
        - **Common/**: Common constants and helper functions.
        - **Config/**: Configuration files for APIs and settings.
          - `API.js`: This file exports an Axios instance with a specified base URL, allowing the application to make HTTP requests to the backend API at the provided URL.
      - **languages/**: JSON files for internationalization (i18n) support.
      - **pages/**: React components representing different pages of the application.
        - **Home/**: Components related to the "Home" page.
      - **script/**: Custom JavaScript functions used in the application.
        - `Commonfunctions.js`: Common JavaScript utility functions, including formatting dates, displaying messages, checking for file extensions and URLs, getting session banner images, and converting numbers to words.
        - `NqafCommonfunctions.js`: JavaScript functions specific to the NQAF (National Quality Assurance Framework) section, including utility functions for handling tasks related to exporting data to CSV, getting compliance names based on their IDs, and obtaining unique elements from an array.
      - **services/**: API service functions for data retrieval.
        - ... (List of API service functions for different sections)
      - **templates/**: React components representing templates for different sections.
        - **DataCommons/** (List of template components for DataCommons section)
            - [DataCommonsDynamicTemplate.js](docs\DataCommonsDynamicTemplate.js.md): **THIS IS THE MAIN TESTING TEMPLATE**.  
      - **themes/**: Theme-related configuration files, responsible for handling the display of content in Arabic (Right-to-Left) direction. 
  - **Pages/**: Razor pages for the .NET Core application.
    - ... (List of Razor pages)
  - **Properties/**: Properties for the .NET Core application.
    - `launchSettings.json`: Configuration for launching the application. It specifies different launch options, environment variables, and URLs for running and debugging the application locally using IIS Express or the UNSD.Website profile on ports 49558 and 5000, respectively.


## Usage

To run the application, you need to have both the .NET Core SDK and Node.js with NPM installed on your machine. To start the development server, follow these steps:

1. Install .NET Core SDK: Visit the official .NET website to download and install the .NET Core SDK.
2. Install Node.js and NPM: Visit the Node.js website to download and install Node.js, which includes NPM.
3. Clone the Git repository: Clone this project's Git repository to your local machine using Git commands.
4. Navigate to the **UNSD.Website/ClientApp** folder: Open a terminal or command prompt, change directory to the **ClientApp** folder.
5. Install frontend dependencies: Run `npm install --legacy-peer-deps` to install the necessary frontend dependencies.
6. In Visual Studio, click the "Start" button. 
