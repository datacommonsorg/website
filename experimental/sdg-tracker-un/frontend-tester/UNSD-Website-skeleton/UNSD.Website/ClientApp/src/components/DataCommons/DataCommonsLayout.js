import { faAngleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BackTop, Layout } from "antd";
import React, { Component } from "react";
import { commonConstants } from "../../helper/Common/CommonConstants";
import DataCommonsMainFooter from "./DataCommonsFooter";
import DataCommonsHeaderInfo from "./DataCommonsHeader";

const { Footer } = Layout;

const DataCommonsLayout = (WrappedComponent) => {
  return class Layout extends Component {
    componentDidMount() {
      document.title = commonConstants.PAGE_TITLE_DATA_COMMONS;
    }
    render() {
      return (
        <div className="datacommons-container">
          <DataCommonsHeaderInfo />
          <div className="datacommons-body">
            <div className="datacommons-inner">
            <WrappedComponent {...this.props} />
            <Footer className="rc-footer">
              <BackTop>
                <div className="backtotop">
                  <FontAwesomeIcon icon={faAngleUp} title="Back to Top" />
                </div>
              </BackTop>
              <DataCommonsMainFooter />
            </Footer>
            </div>
          </div>
        </div>
      );
    }
  };
};

export default DataCommonsLayout;
