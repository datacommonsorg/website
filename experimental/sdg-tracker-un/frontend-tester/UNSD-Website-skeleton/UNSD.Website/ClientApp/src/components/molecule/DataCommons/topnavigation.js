import React, { Component } from "react";
import { Row, Col, Breadcrumb } from "antd";
import { RightOutlined } from "@ant-design/icons";

import { Text, textAsString, LanguageContext } from "../../../containers/Language";
import { routePathConstants } from "../../../helper/Common/RoutePathConstants";
const style = { width: "26px", margin: "0 10px 0 0", float: "left" };

export default class TopNavigation extends Component {
    render() {
        return (
            <React.Fragment>
                <Row gutter={{ xs: 32, sm: 32, md: 32, lg: 32 }}>
                    <Col
                        className='gutter-row'
                        xs={{ span: 24 }}
                        md={{ span: 16 }}
                        lg={{ span: 16 }}
                    >
                        <img
                            src='images/logo.png'
                            alt=''
                           
                            className='un-logo xs-hidden'
                        />
                        <Breadcrumb separator={<RightOutlined />}>
                            <Breadcrumb.Item>
                                <a
                                    href='https://www.un.org/'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    <Text tid='TopNavBreadcrumb1' />
                                </a>
                            </Breadcrumb.Item>
                            <Breadcrumb.Item>
                                <a
                                    href='https://www.un.org/en/desa'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    <Text tid='TopNavBreadcrumb2' />
                                </a>
                            </Breadcrumb.Item>
                            <Breadcrumb.Item>
                                <a href={routePathConstants.HOME_PATH} rel='noopener noreferrer'>
                                    <Text tid="TopNavBreadcrumb3" />
                                </a>
                            </Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col
                        className='gutter-row'
                        xs={{ span: 24 }}
                        md={{ span: 8 }}
                        lg={{ span: 8 }}
                    >
                        
                    </Col>
                </Row>
            </React.Fragment>
        );
    }
}
