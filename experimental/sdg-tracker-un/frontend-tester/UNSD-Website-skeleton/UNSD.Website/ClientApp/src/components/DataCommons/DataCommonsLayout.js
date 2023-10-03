import { faAngleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BackTop, Layout } from "antd";
import React, { Component } from "react";
import { Seo } from "../../components/atom/Seo";
import { commonConstants } from "../../helper/Common/CommonConstants";
import DataCommonsMainFooter from "./DataCommonsFooter";
import DataCommonsHeaderInfo from "./DataCommonsHeader";

const { Footer } = Layout;

const DataCommonsLayout = (WrappedComponent) => {
  return class Layout extends Component {
    constructor() {
      super();
      this.datacommonsBody = React.createRef();
    }
    componentDidMount() {
      document.title = commonConstants.PAGE_TITLE_DATA_COMMONS;
    }
    render() {
      return (
        <div className="datacommons-container">
          <Seo
            title={"UNSD - Data Commons for the SDGs"}
            description={
              "The UN Data Commons for the SDGs platform integrates authoritative SDG data from across the UN System into a public repository with a user-friendly interface and an advanced natural language search functionality. This data analysis and exploration tool is the product of an ongoing effort by the United Nations Statistics Division, supported by Google's Data Commons and funded by Google.org, with the ultimate goal of making authoritative data from the UN --including SDG data-- more accessible to the public."
            }
            image={
              "https://unstats.un.org/UNSDWebsite/images/datacommons/un-dc-sdg-logo.png"
            }
          />
          <DataCommonsHeaderInfo />
          <div ref={this.datacommonsBody} className="datacommons-body">
            <div className="datacommons-inner">
              <WrappedComponent {...this.props} />
              <Footer className="rc-footer">
                <DataCommonsMainFooter />
              </Footer>
            </div>
            <BackTop target={() => this.datacommonsBody.current}>
              <div className="backtotop">
                <FontAwesomeIcon icon={faAngleUp} title="Back to Top" />
              </div>
            </BackTop>
          </div>
        </div>
      );
    }
  };
};

export default DataCommonsLayout;
