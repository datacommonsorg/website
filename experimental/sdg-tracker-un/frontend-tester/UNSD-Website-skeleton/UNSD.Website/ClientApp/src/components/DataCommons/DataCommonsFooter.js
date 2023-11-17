import React, { Component } from "react";
import { Row, Col } from "antd";
import { TwitterOutlined, YoutubeFilled } from "@ant-design/icons";
import { Text } from "../../containers/Language";
import { commonConstants } from "../../helper/Common/CommonConstants";

export default class DataCommonsMainFooter extends Component {
  openWindow(url) {
    window.open(url);
  }
  render() {
    return (
      <section className='rc-footer-section'>
        <div className='container'>
          <Row gutter={{ xs: 32, sm: 32, md: 32, lg: 32 }}>
            <Col
              className='gutter-row'
              xs={{ span: 24 }}
              md={{ span: 12 }}
              lg={{ span: 12 }}
            >
              <img src='./images/unlogo_1.png' alt='unlogo' />
            </Col>
            <Col
              className='gutter-row'
              xs={{ span: 24 }}
              md={{ span: 12 }}
              lg={{ span: 12 }}
            >
              <div className='icons-list'>
                <TwitterOutlined
                  onClick={(e) => {
                    this.openWindow(commonConstants.TWITTER_URL);
                  }}
                />
                <YoutubeFilled
                  onClick={(e) => {
                    this.openWindow(commonConstants.YOUTUBE_URL);
                  }}
                />
              </div>
            </Col>
          </Row>
          <hr />
          <Row gutter={{ xs: 32, sm: 32, md: 32, lg: 32 }}>
            <Col
              className='gutter-row copyright-wrap'
              xs={{ span: 24 }}
              md={{ span: 12 }}
              lg={{ span: 12 }}
            >
              <a
                href={commonConstants.COPYRIGHT}
                target='_blank'
                rel='noopener noreferrer'
              >
                            &copy; {new Date().getFullYear()} <Text tid='FooterCopyRight' />
              </a>
                        &nbsp;  |  &nbsp;
                <a
                    href='https://www.datacommons.org/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-capitalize'
                >
                    Powered by Google Data Commons
                </a>
            </Col>
            <Col
              className='gutter-row'
              xs={{ span: 24 }}
              md={{ span: 12 }}
              lg={{ span: 12 }}
            >
              <div className='links'>
                <a
                  href={commonConstants.TERMS_OF_USE}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <Text tid='FooterTerms' />
                </a>
                <span className='mx-2'>|</span>
                <a
                  href={commonConstants.PRIVACY_NOTICE}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <Text tid='FooterPrivacyNotice' />
                </a>
                <span className='mx-2'>|</span>
                <a
                  href={commonConstants.FRAUD_ALERT}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <Text tid='FooterFraudAlert' />
                </a>
              </div>
            </Col>
          </Row>
        </div>
      </section>
    );
  }
}
