import React, { Component } from 'react';
import { Layout, BackTop } from 'antd';
import { faAngleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DataCommonsHeaderInfo from './DataCommonsHeader';
import DataCommonsMainFooter from './DataCommonsFooter';
import { commonConstants } from "../../helper/Common/CommonConstants";

const { Footer } = Layout;

const DataCommonsLayout = (WrappedComponent) => {
    return class Layout extends Component {
        componentDidMount() {
            document.title = commonConstants.PAGE_TITLE_DATA_COMMONS;
        }
        render() {
            return (
                <React.Fragment>
                    <div className=''>
                        <DataCommonsHeaderInfo />
                        <WrappedComponent {...this.props} />
                        <Footer className='rc-footer'>
                            <BackTop>
                                <div className='backtotop'>
                                    <FontAwesomeIcon icon={faAngleUp} title='Back to Top' />
                                </div>
                            </BackTop>
                            <DataCommonsMainFooter />
                        </Footer>
                    </div>
                </React.Fragment>
            );
        }
    }
}

export default DataCommonsLayout;

