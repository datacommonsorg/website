import React, { Component } from 'react';
import { Row, Col, List } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhoneAlt } from '@fortawesome/free-solid-svg-icons';
import { TwitterOutlined, YoutubeFilled } from '@ant-design/icons';
import { commonConstants } from '../helper/Common/CommonConstants';
import { Image } from '../components/atom/Image';
import { Text } from '../containers/Language'
import { faEnvelope } from '@fortawesome/free-regular-svg-icons';
export default class MainFooter extends Component {
    openWindow(url) {
        window.open(url);
    }
    render() {
        return (
            <section className='footer-section'>
                <div className='container'>
                    <Row gutter={32}>
                        <Col className='gutter-row mb-3' xs={{ span: 24 }} md={{ span: 8 }} lg={{ span: 8 }}>
                            <h4 className='mb-3 pb-2'><Text tid="NavAbout"/></h4>
                            <p><Text tid="UNSDAboutIntrop"/></p>
                            <p><Image image={'unlogo_1.png'} className={''} /></p>
                        </Col>
                        <Col className='gutter-row mb-3' xs={{ span: 24 }} md={{ span: 8 }} lg={{ span: 8 }}>
                            <h4 className='mb-3 pb-2'><Text tid="UNSDWorkProgrammeh4"/></h4>
                            <List>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/classifications/'><Text tid="NavStatisticalClassification"/></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/bigdata/'><Text tid="NavBigData" /></a></List.Item>
                                <List.Item className='py-1'><a href='http://unstats.un.org/sdgs/'><Text tid="NavDevIndicators"/></a></List.Item>
                                <List.Item className='py-1'><a href='http://ggim.un.org/'><Text tid="NavGeoSpatialInfo"/></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/demographic-social/index.cshtml'><Text tid="FooterDemographic" /></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/demographic-social/gender/index.cshtml'><Text tid="FooterGenderStat" /></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/industry/'><Text tid="NavIndustrialStat"/></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/trade/default.asp'><Text tid="NavTradeStat" /></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/tourism/'><Text tid="NavTourismStat" /></a></List.Item>
                                <List.Item className='py-1'><a href='http://unstats.un.org/unsd/nationalaccount/default.asp'><Text tid="NavNationalAccounts" /></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/energystats/'><Text tid="NavEnergyStat" /></a></List.Item>
                                <List.Item className='py-1'><a href='https://unstats.un.org/unsd/envstats/'><Text tid="NavEnvStat" /></a></List.Item>
                                <List.Item className='py-1'><a href='https://seea.un.org/'><Text tid="NavEnvAccounting" /></a></List.Item>
                            </List>
                        </Col>
                        <Col className='gutter-row mb-3' xs={{ span: 24 }} md={{ span: 8 }} lg={{ span: 8 }}>
                            <h4 className='mb-3 pb-2'><Text tid="FooterContact"/></h4>
                            <p><Text tid="FooterAddressine1p"/><br/>
                                <Text tid="FooterAddressine2p"/><br />
                                <Text tid="FooterAddressine3p" /><br />
                                <Text tid="FooterAddressine4p" /></p>
                            <p><FontAwesomeIcon icon={faEnvelope} /> <a href='mailto:statistics@un.org'>statistics@un.org</a><br />
                                <FontAwesomeIcon icon={faPhoneAlt} /> <Text tid="FooterFax" /> +1 (212) 963-9851</p>
                            <h4 className='mb-3 pb-2'><Text tid="FooterStayConnected"/></h4>
                            <div className='icons-list'>
                                <TwitterOutlined onClick={e => { this.openWindow(commonConstants.TWITTER_URL) }} />
                                <YoutubeFilled onClick={e => { this.openWindow(commonConstants.YOUTUBE_URL) }} />
                            </div>
                        </Col>
                    </Row>
                    <Row gutter={32} className='mt-1'>
                        <Col className='gutter-row' xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 12 }}>
                            <a href={commonConstants.COPYRIGHT} target='_blank' rel="noreferrer" className='copyrights'>&copy; {new Date().getFullYear()} <Text tid='FooterCopyRight' /></a>
                        </Col>
                        <Col className='gutter-row' xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 12 }}>
                            <div className='links'>
                                <a href={commonConstants.TERMS_OF_USE} target='_blank' rel="noreferrer"><Text tid='FooterTerms' /></a>
                                <span className='mx-2'>|</span>
                                <a href={commonConstants.PRIVACY_NOTICE} target='_blank' rel="noreferrer"><Text tid='FooterPrivacyNotice' /></a>
                                <span className='mx-2'>|</span>
                                <a href={commonConstants.FRAUD_ALERT} target='_blank' rel="noreferrer"><Text tid='FooterFraudAlert' /></a>
                            </div>
                        </Col>
                    </Row>
                </div>
            </section>
        );
    }
}
