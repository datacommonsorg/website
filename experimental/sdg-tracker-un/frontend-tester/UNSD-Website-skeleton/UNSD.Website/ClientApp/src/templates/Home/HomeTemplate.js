import React, { Component } from "react";
import { Row, Col } from "antd";
import HomeBanner from "../../components/molecule/HomeComponent/HomeBanner";
import { getHomeDetails } from "../../services/Home/HomeService";
import parse from "html-react-parser";

import { Text, LanguageContext } from "../../containers/Language";


export class HomeTemplate extends Component {
    static contextType = LanguageContext;

    constructor(props) {
        super(props);

        this.state = {
            homeData: null,
            lanuage: null,
        };
    }
    async componentDidMount() {
        let lang = this.context;
        let homData = await getHomeDetails(lang.userLanguage);
        this.setState({
            homeData: homData,
            lanuage: lang.userLanguage,
        });
    }
    async componentDidUpdate(prevProps, prevStates) {
        let lang = this.context;
        if (prevStates.lanuage != lang.userLanguage) {
            let homData = await getHomeDetails(lang.userLanguage);
            this.setState({
                homeData: homData,
                lanuage: lang.userLanguage,
            });
        }
    }

    render() {
        return (
            <React.Fragment>
                <HomeBanner url="Home/get-home-banner" />
                <div className="home-about">
                    <div className="container">
                        <Row gutter={32}>
                            <Col className="gutter-row my-3" span={24}>
                                {this.state.homeData ? (
                                    <div>{parse(this.state.homeData.description)}</div>
                                ) : (
                                    ""
                                )}
                            </Col>
                            <Col className="gutter-row my-3" span={24}>
                                <p className="introtext">
                                    <Text tid="UNSDAboutIntrop" />
                                </p>
                            </Col>
                            {/*<Col
                                className="gutter-row"
                                xs={{ span: 24 }}
                                md={{ span: 17 }}
                                lg={{ span: 17 }}
                            >
                                <Row gutter={32} className="mb-3">
                                    <Col className="gutter-row" span={24}>
                                        <h2 className="mb-3">
                                            <Text tid="HomeNewsTitleH2" />
                                        </h2>
                                        <HomeNews />
                                    </Col>
                                    <Col className="gutter-row mt-3 mb-3" span={24}>
                                        <h2 className="mb-3">
                                            <Text tid="HomeVideosTitleH2" />
                                        </h2>
                                        <FeaturedVideos />
                                    </Col>
                                    <Col className="gutter-row mt-3" span={24}>
                                        <h2 className="mb-3">
                                            <Text tid="CommitmentTitleH2" />
                                        </h2>
                                        <Commitments />
                                    </Col>
                                    <Col
                                        className="gutter-row"
                                        xs={{ span: 24 }}
                                        md={{ span: 12 }}
                                        lg={{ span: 12 }}
                                    >
                                        <h2 className="mb-3">
                                            <Text tid="HomeELearningTitleH2" />
                                        </h2>
                                        <ELearning />
                                    </Col>
                                    <Col
                                        className="gutter-row"
                                        xs={{ span: 24 }}
                                        md={{ span: 12 }}
                                        lg={{ span: 12 }}
                                    >
                                        <h2 className="mb-3">
                                            <Text tid="HomePartnersTitleH2" />
                                        </h2>
                                        <Partners />
                                    </Col>
                                </Row>
                            </Col>
                            <Col
                                className="gutter-row"
                                xs={{ span: 24 }}
                                md={{ span: 7 }}
                                lg={{ span: 7 }}
                            >
                                <HomeMeetingEvents />
                                <Row gutter={32}>
                                    <Col className="gutter-row my-3" span={24}>
                                        <TwitterFeeds />
                                    </Col>
                                    <Col className="gutter-row" span={24}>
                                        <h2 className="mb-3">
                                            {" "}
                                            <Text tid="HomeFeaturedDatbaseTitleH2" />{" "}
                                        </h2>
                                        <FeaturedDatabases />
                                    </Col>
                                </Row>
                            </Col>*/}
                        </Row>
                    </div>
                </div>
            </React.Fragment>
        );
    }
};
