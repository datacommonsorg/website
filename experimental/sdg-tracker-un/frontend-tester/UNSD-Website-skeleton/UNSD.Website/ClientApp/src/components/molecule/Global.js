import React, { Component } from 'react';
import { Row, Col } from 'antd';
import { withRouter } from "react-router-dom";
import { Image } from '../atom/Image';
import Search from '../atom/GcseSearch/Search';
import ClientOnly from '../atom/GcseSearch/ClientOnly';
import { Text } from '../../containers/Language';
import { routeDataforNowBasepath, routeCapacityDevelopmentBasepath } from "../../helper/Common/RoutePathConstants";
import { commonConstants } from "../../helper/Common/CommonConstants";

class Global extends Component {
    addPlaceholder = () => {
        document.getElementById('gsc-i-id1').setAttribute('placeholder', 'Search');
    };

    componentDidUpdate() {
        this.setTabTitle();
    };

    setTabTitle() {
        let title = commonConstants.PAGE_TITLE;
        let urlPath = window.location.pathname.toLowerCase();
        if (urlPath.indexOf(routeDataforNowBasepath) != -1) {
            title = commonConstants.PAGE_TITLE_DATA_FOR_NOW;
        }
        else if (urlPath.indexOf(routeCapacityDevelopmentBasepath) != -1) {
            title = commonConstants.PAGE_TITLE_CAPACITY_DEVELOPMENT;
        }
        document.title = title;
    };

    render() {
        return (
            <Row gutter={{ xs: 32, sm: 32, md: 32, lg: 32 }}>
                <Col xs={{ span: 24 }} md={{ span: 16 }} lg={{ span: 16 }}>
                    <Row>
                        <Col className="gutter-row mobile-wrap">
                            {/*<a href="./" target="_blank" className="logo-wrap">*/}
                                <Image image={"unlogo.png"} alt="unlogo" className={"logo"} />{/*</a>*/}
                            {this.props.children}
                        </Col>
                        <Col className="gutter-row">
                            <h3 className="main-title"><Text tid="GlobalH3" /></h3>
                            <div className="sub-title">
                                <span><Text tid="GlobalSpan1" /></span>
                            </div>
                        </Col>
                        
                    </Row>
                </Col>
                <Col xs={{ span: 24 }} md={{ span: 7 }} lg={{ span: 7 }}>
                    <ClientOnly>
                        <Search />
                    </ClientOnly>
                </Col>
                {/*<Col xs={{ span: 24 }} md={{ span: 7 }} lg={{ span: 7 }}>
                    <div className="gcse-search"></div>
                </Col>*/}
                    

            </Row>
        );
    }
}

export default withRouter(Global);