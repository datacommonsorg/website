import React, { Component } from 'react';
import { Row, Col } from 'antd';
import ClientOnly from '../../atom/GcseSearch/ClientOnly';
import Search from '../../atom/GcseSearch/Search';
import { Text } from '../../../containers/Language';
import { routeResourceCatalogPathConstants } from '../../../helper/Common/RoutePathConstants';

export default class Global extends Component {
    addPlaceholder = () => {
        document.getElementById('gsc-i-id1').setAttribute('placeholder', 'Search');
    };

    render() {
        return (
            <Row gutter={{ xs: 32, sm: 32, md: 32, lg: 32 }}>
                <Col xs={{ span: 24 }} md={{ span: 16 }} lg={{ span: 16 }}>
                    <Row>
                        <Col className="gutter-row mobile-wrap">
                            {/*<a href={routeResourceCatalogPathConstants.HOME_PATH} className="logo-wrap">*/}
                                <img src="./images/unlogo.png" alt="unlogo.png" className="logo" />
                            {/*</a>*/}
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
            </Row>
        );
    }
}
