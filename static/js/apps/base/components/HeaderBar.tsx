import React, { ReactElement } from "react";

import { Routes } from "../../../shared/types/general";
import { Labels } from "../main";

interface HeaderBarProps {
  name: string;
  logoPath: string;
  labels: Labels;
  routes: Routes;
}

const HeaderBar = ({
  name,
  logoPath,
  labels,
  routes,
}: HeaderBarProps): ReactElement => {
  return (
    <header id="main-header">
      <nav className="navbar navbar-light navbar-expand-lg col" id="main-nav">
        <div className="container-fluid">
          <div className="navbar-brand">
            {logoPath && (
              <div id="main-header-logo">
                <a href={routes.homepage} aria-label={labels.backToHomepage}>
                  <img src={logoPath} alt={`${name} logo`} />
                </a>
              </div>
            )}
            <a href={routes.homepage}>{name}</a>
          </div>
          <button
            className="navbar-toggler"
            type="button"
            data-toggle="collapse"
            data-target="#dc-main-nav"
            aria-label={labels.showSiteNavigation}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div
            className="collapse navbar-collapse justify-content-md-end"
            id="dc-main-nav"
          >
            <ul className="navbar-nav float-md-right">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="nav-explore-dropdown"
                  role="button"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-label={labels.showExplorationTools}
                >
                  {labels.explore}
                </a>
                <div
                  className="dropdown-menu"
                  aria-labelledby="nav-explore-dropdown"
                >
                  <a className="dropdown-item" href={routes.place_place}>
                    {labels.placeExplorer}
                  </a>
                  <a
                    className="dropdown-item"
                    href={routes.browser_browser_main}
                  >
                    {labels.knowledgeGraph}
                  </a>
                  <a
                    className="dropdown-item"
                    href={`${routes.tools_visualization}#visType=timeline`}
                  >
                    {labels.timelineExplorer}
                  </a>
                  <a
                    className="dropdown-item"
                    href={`${routes.tools_visualization}#visType=scatter`}
                  >
                    {labels.scatterplotExplorer}
                  </a>
                  <a
                    className="dropdown-item"
                    href={`${routes.tools_visualization}#visType=map`}
                  >
                    {labels.mapExplorer}
                  </a>
                  <a className="dropdown-item" href={routes.tools_stat_var}>
                    {labels.statisticalVariableExplorer}
                  </a>
                  <a className="dropdown-item" href={routes.tools_download}>
                    {labels.dataDownloadTool}
                  </a>
                </div>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="nav-doc-dropdown"
                  role="button"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-label={labels.showDocumentationLinks}
                >
                  {labels.documentation}
                </a>
                <div
                  className="dropdown-menu"
                  aria-labelledby="nav-doc-dropdown"
                >
                  <a
                    className="dropdown-item"
                    href="https://docs.datacommons.org"
                  >
                    {labels.documentation}
                  </a>
                  <a
                    className="dropdown-item"
                    href="https://docs.datacommons.org/api"
                  >
                    {labels.apis}
                  </a>
                  {/* TODO: UNCOMMENT TO RE-ENABLE BIGQUERY */}
                  {/* <a className="dropdown-item" href="https://docs.datacommons.org/bigquery">{labels.bigQuery}</a> */}
                  <a
                    className="dropdown-item"
                    href="https://docs.datacommons.org/tutorials"
                  >
                    {labels.tutorials}
                  </a>
                  <a
                    className="dropdown-item"
                    href="https://docs.datacommons.org/contributing/"
                  >
                    {labels.contribute}
                  </a>
                </div>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="nav-about-dropdown"
                  role="button"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-label={labels.showAboutLinks}
                >
                  {labels.about}
                </a>
                <div
                  className="dropdown-menu dropdown-menu-right"
                  aria-labelledby="nav-about-dropdown"
                >
                  <a className="dropdown-item" href={routes.static_about}>
                    {labels.aboutDataCommons}
                  </a>
                  <a
                    className="dropdown-item"
                    href="https://blog.datacommons.org/"
                  >
                    {labels.blog}
                  </a>
                  <a
                    className="dropdown-item"
                    href="https://docs.datacommons.org/datasets/"
                  >
                    {labels.dataSources}
                  </a>
                  <a className="dropdown-item" href={routes.static_faq}>
                    {labels.faq}
                  </a>
                  <a className="dropdown-item" href={routes.static_feedback}>
                    {labels.feedback}
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default HeaderBar;
