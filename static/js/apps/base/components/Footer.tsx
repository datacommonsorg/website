import React, { ReactElement } from "react";

import { Routes } from "../../../shared/types/general";
import { Labels } from "../main";

interface FooterProps {
  hideFullFooter: boolean;
  hideSubFooter: boolean;
  subFooterExtra: string;
  brandLogoLight: boolean;
  labels: Labels;
  routes: Routes;
}

const Footer = ({
  hideFullFooter,
  hideSubFooter,
  subFooterExtra,
  brandLogoLight,
  labels,
  routes,
}: FooterProps): ReactElement => {
  return (
    <footer id="main-footer">
      {!hideFullFooter && (
        <div className="container top-footer">
          <div className="row">
            <section className="col-12 col-sm-6 col-md-4">
              {/* TRANSLATORS: The label for a collection of exploration tools. */}
              <h6>{labels.tools}</h6>
              {/* TRANSLATORS: The name of a tool to browse statistics about a place. */}
              <a href={routes.place_place}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.placeExplorer}</span>
              </a>
              {/* TRANSLATORS: The name of a tool to browse the Data Commons knowledge graph. */}
              <a href={routes.browser_browser_main}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.knowledgeGraph}</span>
              </a>
              {/* TRANSLATORS: The name of a tool to explore timeline charts of statistical variables for places. */}
              <a href={`${routes.tools_visualization}#visType=timeline`}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.timelineExplorer}</span>
              </a>
              {/* TRANSLATORS: The name of a tool to explore scatter plots of statistical variables for places. */}
              <a href={`${routes.tools_visualization}#visType=scatter`}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.scatterplotExplorer}</span>
              </a>
              {/* TRANSLATORS: The name of a tool to explore maps of statistical variables for places. */}
              <a href={`${routes.tools_visualization}#visType=map`}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.mapExplorer}</span>
              </a>
              {/* TRANSLATORS: The name of a tool that provides observation and import information about statistical variables. */}
              <a href={routes.tools_stat_var}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.statisticalVariableExplorer}</span>
              </a>
              {/* TRANSLATORS: The name of a tool that allows users to download data. */}
              <a href={routes.tools_download}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.dataDownloadTool}</span>
              </a>
            </section>
            <section className="col-12 col-sm-6 col-md-4">
              {/* TRANSLATORS: The label for a list of documentation links. */}
              <h6>{labels.documentation}</h6>
              {/* TRANSLATORS: The label for a link to our documentation site. */}
              <a href="https://docs.datacommons.org">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.documentation}</span>
              </a>
              {/* TRANSLATORS: The label for a link to our API documentation. */}
              <a href="https://docs.datacommons.org/api">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.apis}</span>
              </a>
              {/* TODO: UNCOMMENT TO RE-ENABLE BIGQUERY */}
              {/* TRANSLATORS: The label for a link to BigQuery integration starter docs. */}
              {/* <a href="https://docs.datacommons.org/bigquery"><span class="material-icons-outlined">arrow_forward</span><span>{labels.bigQuery}</span></a>*/}
              {/* TRANSLATORS: The label for a link to our API tutorials. */}
              <a href="https://docs.datacommons.org/tutorials">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.tutorials}</span>
              </a>
              {/* TRANSLATORS: The label for a link to instructions about contributing to the project. */}
              <a href="https://docs.datacommons.org/contributing/">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.contribute}</span>
              </a>
              {/* TRANSLATORS: The label for a link to the project's github repository (for open sourced code). */}
              <a href="http://github.com/datacommonsorg">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.githubRepository}</span>
              </a>
            </section>
            <section className="col-12 col-sm-6 col-md-4">
              {/* TRANSLATORS: The label for a link to informational pages about the Data Commons project. */}
              <h6>{labels.dataCommons}</h6>
              {/* TRANSLATORS: The label for a link to the project's about page. */}
              <a href={routes.static_about}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.aboutDataCommons}</span>
              </a>
              {/* TRANSLATORS: The label for a link to the project's blog. */}
              <a href="https://blog.datacommons.org/">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.blog}</span>
              </a>
              {/* TRANSLATORS: The label for a link to data sources included in the Data Commons knowledge graph. */}
              <a href="https://docs.datacommons.org/datasets/">
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.dataSources}</span>
              </a>
              {/* TRANSLATORS: The label for a link to instructions about sending feedback. */}
              <a href={routes.static_feedback}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.feedback}</span>
              </a>
              {/* TRANSLATORS: The label for a link to project FAQ page. */}
              <a href={routes.static_faq}>
                <span className="material-icons-outlined">arrow_forward</span>
                <span>{labels.frequentlyAskedQuestions}</span>
              </a>
            </section>
          </div>
        </div>
      )}
      {!hideSubFooter && (
        <div id="sub-footer">
          <div className="container">
            {/* TRANSLATORS: The label for the Google branding byline. */}
            <span className="brand-byline">
              <span className="brand-text">{labels.anInitiativeFrom}</span>
              <img
                className="brand-logo"
                width="74"
                height="25"
                src={
                  brandLogoLight
                    ? "/images/google-logo-reverse.svg"
                    : "/images/google-logo.svg"
                }
                alt="Google logo"
              />
              <img
                className="brand-logo"
                width="74"
                height="25"
                src="/images/google-logo-reverse.svg"
                alt="Google logo"
              />
            </span>
            <div className="sub-footer-links">
              {subFooterExtra && (
                <div dangerouslySetInnerHTML={{ __html: subFooterExtra }} />
              )}
              {/* TRANSLATORS: The label for a link to site terms and conditions. */}
              <a href="https://policies.google.com/terms">
                <span>{labels.termsAndConditions}</span>
              </a>
              {/* TRANSLATORS: The label for a link to site privacy policy. */}
              <a href="https://policies.google.com/privacy?hl=en-US">
                <span>{labels.privacyPolicy}</span>
              </a>
              {/* TRANSLATORS: The label for a link to site disclaimers. */}
              <a href={routes.static_disclaimers}>
                <span>{labels.disclaimer}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
