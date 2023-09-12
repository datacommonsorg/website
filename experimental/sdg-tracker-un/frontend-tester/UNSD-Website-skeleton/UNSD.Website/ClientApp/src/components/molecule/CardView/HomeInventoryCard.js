import React, { Component } from "react";
import { Row, Col, Card, } from "antd";
import { routeResourceCatalogPathConstants } from '../../../helper/Common/RoutePathConstants';
import { commonConstants } from "../../../helper/Common/ResourceCatalog/CommonConstants";
import { Button } from "../../atom/Button";
import { Text } from "../../../containers/Language";

export class HomeInventoryCard extends Component {
    callBack = (id) => {
        if (this.props.CardInfo.source === "form") {
            window.open(`${routeResourceCatalogPathConstants.DETAILED_VIEW}/${id}`, "_self");
        } else {
            window.open(this.props.CardInfo.url, "_blank");
        }
    };
    render() {
        const cardInfo = this.props.CardInfo;

        return (
            <React.Fragment>
                <Card style={{ width: "100%", marginBottom: "24px", padding: "0" }}>
                    <Row className='p-0'>
                        <Col
                            className='gutter-row home-inventory-image'
                            xs={{ span: 24 }}
                            md={{ span: 24 }}
                            lg={{ span: 24 }}
                        >
                            <span
                                className={
                                    cardInfo.source === "form"
                                        ? "case-study-badge"
                                        : "international-guidelines-badge"
                                }
                            >
                                {cardInfo.resource_type}
                            </span>
                            <img
                                src={cardInfo.image ? commonConstants.DEFAULT_ImagePath + cardInfo.image
                                    : commonConstants.DEFAULT_Image
                                }
                                alt=''
                                className='img-responsive'
                            />
                        </Col>
                        <Col
                            className='gutter-row home-inventory-text'
                            xs={{ span: 24 }}
                            md={{ span: 24 }}
                            lg={{ span: 24 }}
                        >
                            <h6 className='rc-title'>{cardInfo.entity_name[0]}</h6>
                            <h5>{cardInfo.title}</h5>
                        </Col>
                        <Col
                            className='gutter-row home-inventory-button text-center'
                            xs={{ span: 24 }}
                            md={{ span: 24 }}
                            lg={{ span: 24 }}
                        >
                            <Button
                                type={"link"}
                                className={"float-right"}
                                labelText={
                                    cardInfo.source === "form" ? (
                                        <Text tid='ViewCaseStudybtn' />
                                    ) : (
                                        <Text tid='ViewMoreBtn' />
                                    )
                                }
                                onClick={() => this.callBack(cardInfo.id)}
                                icon={cardInfo.source === "form" ? null : "external-link-alt"}
                            />
                        </Col>
                    </Row>
                </Card>
            </React.Fragment>
        );
    }
}
