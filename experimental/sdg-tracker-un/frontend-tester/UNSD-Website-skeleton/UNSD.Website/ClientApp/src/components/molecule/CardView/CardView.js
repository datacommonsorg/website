import React, { Component } from "react";
import { Row, Col, Card, Modal } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFacebookSquare,
    faTwitterSquare,
} from "@fortawesome/free-brands-svg-icons";
import {
    faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import parse from "html-react-parser";
import { resourceCatalogConstant } from "../../../helper/Common/ResourceCatalogConstant";
import { Button } from "../../atom/Button";
import { Text } from "../../../containers/Language";
import { Date } from "../../atom/Date/index";
import { ReadMoreAndLess } from "../ReadMoreAndLess/ReadMoreAndLess";
import {
    FacebookShareButton,
    TwitterShareButton,
    EmailShareButton,
} from "react-share";
import { library } from "@fortawesome/fontawesome-svg-core";
let tagsArray = [];
let shareUrl = "";

export class CardView extends Component {
    //onCardClick = (url, id) => {
    //    this.props.cardCallback(url, id);
    //}

    state = {
        modalVisible: resourceCatalogConstant.SETFALSE,
        modalTitle: '',
        modalDescription: ''
    }
    setModalVisible = (title, description) => {
        this.setState({
            modalVisible: resourceCatalogConstant.SETTRUE,
            modalTitle: title,
            modalDescription: description
        });
    }
    closeModal = () => {
        this.setState({
            modalVisible: resourceCatalogConstant.SETFALSE,
        });
    }

    callBack = (cardinfo) => {
        this.props.onClick(cardinfo);
    };
    onTagClick = (tagObj) => {
        this.props.linkClick(tagObj);
    };

    getTagsArray = (cardInfo, page) => {
        if (page == "Inventory") {
            cardInfo.cross_cutting_issues.map(function (item, index) {
                var TagsObject = {};

                TagsObject.key = resourceCatalogConstant.CROSS_CUTTING_ISSUE
                TagsObject.value = item
                tagsArray.push(TagsObject);
            })
            cardInfo.domains.map(function (item, index) {
                var TagsObject = {};

                TagsObject.key = resourceCatalogConstant.DOMAIN
                TagsObject.value = item
                tagsArray.push(TagsObject);
            })
            cardInfo.language.map(function (item, index) {
                var TagsObject = {};

                TagsObject.key = resourceCatalogConstant.LANGUAGE
                TagsObject.value = item
                tagsArray.push(TagsObject);
            })
            var TagsObject = {};
            TagsObject.key = resourceCatalogConstant.RESOURCE_TYPE
            TagsObject.value = cardInfo.resource_type
            tagsArray.push(TagsObject);
        }
    }

    getShareURl(cardInfo, page) {
        if (page == "Inventory") {
            shareUrl =
                cardInfo.source === 'form'
                    ? window.location.origin +
                    '/InventoryOfResources/app/DetailedView/' +
                    cardInfo.id
                    : cardInfo.url;
        }
    }
    render() {
        const lang = this.context;
        const cardInfo = this.props.CardInfo;
        tagsArray = [];

        this.getTagsArray(cardInfo, this.props.page);
        this.getShareURl(cardInfo, this.props.page);


        const title = cardInfo.title;

        return (
            <React.Fragment>
                <Modal
                    title={this.state.modalTitle}
                    centered
                    visible={this.state.modalVisible}
                    onCancel={() => this.closeModal()}
                    footer={[
                        <Button
                            type={'primary'}
                            shape={'round'}
                            labelText={'OK'}
                            onClick={() => this.closeModal()}
                        />,
                    ]}
                >
                    <div>{this.state.modalDescription}</div>
                </Modal>
                <Card style={{ width: '100%' }}>
                    <span
                        className={
                            cardInfo.source === 'form'
                                ? 'inventory-badge case-study-badge'
                                : 'inventory-badge international-guidelines-badge'
                        }
                    >
                        {cardInfo.resource_type}
                    </span>
                    <Row>
                        <Col
                            className='gutter-row inventory-image'
                            xs={{ span: 24 }}
                            md={{ span: 6 }}
                            lg={{ span: 6 }}
                        >
                            <img
                                src={cardInfo.image ? resourceCatalogConstant.DEFAULT_ImagePath + cardInfo.image
                                    : resourceCatalogConstant.DEFAULT_Image
                                }
                                alt=' '
                                className='img-responsive'
                            />
                        </Col>
                        <Col
                            className='gutter-row inventory-text'
                            xs={{ span: 24 }}
                            md={{ span: 18 }}
                            lg={{ span: 18 }}
                        >
                            <h6>{cardInfo.entity_name[0]}</h6>
                            <h5>
                                <a onClick={() => this.callBack(cardInfo)}>
                                    {cardInfo.title}
                                </a>
                            </h5>
                            {
                                <p>
                                    {' '}
                                    <Date date={cardInfo.file_date} />
                                </p>
                            }
                        </Col>
                        <Col className="gutter-row inventory-info-text"
                            xs={{ span: 24 }}
                            md={{ span: 24 }}
                            lg={{ span: 24 }}>
                            <div className="inventory-content">
                                {/* <Tooltip placement="bottom" title={parse(cardInfo.description)} style={{ maxWidth: '40%' }}>*/}
                                {parse(cardInfo.description)}
                                {/* </Tooltip>*/}
                            </div>

                            <p style={{ marginTop: '8px' }}>
                                <a
                                    onClick={() =>
                                        this.setModalVisible(
                                            cardInfo.title,
                                            parse(cardInfo.description)
                                        )
                                    }
                                >
                                    <Text tid='ReadFullDescription' />
                                </a>
                            </p>

                            <div className='inventory-tags' style={{ fontWeight: '500' }}>
                                {
                                    <ReadMoreAndLess
                                        tags={tagsArray}
                                        onTagCallback={this.onTagClick}
                                    />
                                }
                            </div>

                            <Row>
                                <Col
                                    className='gutter-row social-share-links'
                                    xs={{ span: 24 }}
                                    md={{ span: 16 }}
                                    lg={{ span: 16 }}
                                >
                                    <p>
                                        <Text tid='ShareVia' />
                                    </p>
                                    <ul>
                                        <li>
                                            <TwitterShareButton
                                                url={shareUrl}
                                                title={title}
                                                className='Demo__some-network__share-button'
                                            >
                                                {/*<TwitterOutlined />*/}
                                                <FontAwesomeIcon
                                                    icon={faTwitterSquare}
                                                    title='Twitter'
                                                />
                                            </TwitterShareButton>
                                        </li>
                                        <li>
                                            <FacebookShareButton
                                                url={shareUrl}
                                                title={title}
                                                className='Demo__some-network__share-button'
                                            >
                                                <FontAwesomeIcon
                                                    icon={faFacebookSquare}
                                                    title='Facebook'
                                                />
                                            </FacebookShareButton>
                                        </li>
                                        <li>
                                            <EmailShareButton
                                                body={shareUrl}
                                                subject={title}
                                                className='Demo__some-network__share-button'
                                            >
                                                <FontAwesomeIcon icon={faEnvelope} title='Email' />
                                            </EmailShareButton>
                                        </li>
                                    </ul>
                                </Col>
                                <Col
                                    className='gutter-row view-more-btn'
                                    xs={{ span: 24 }}
                                    md={{ span: 8 }}
                                    lg={{ span: 8 }}
                                >
                                    <Button
                                        type={'primary'}
                                        shape={'round'}
                                        labelText={
                                            cardInfo.source === 'form' ? (
                                                <Text tid='ViewCaseStudybtn' />
                                            ) : (
                                                    <Text tid='ViewMoreBtn' />
                                                )
                                        }
                                        className={'float-right'}
                                        onClick={() => this.callBack(cardInfo)}
                                        icon={cardInfo.source === 'form' ? null : 'external'}
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Card>
            </React.Fragment>
        );
    }
}
