import { Link } from "react-router-dom";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Breadcrumb, Row, Col } from "antd";
import { routePathConstants } from "../../helper/Common/RoutePathConstants";
import { commonConstants } from "../../helper/Common/CommonConstants";
import {
  TabHeadingFormat,
  getOrdinalNum,
  GetYear,
  CheckNullOrEmptyValue,
  getBannerImageBySessionId,
  getUrl,
} from "../../script/Commonfunctions";
import React from "react";
import parse from "html-react-parser";

export const SideEventLayout = ({
  SessionId = "",
  DisplayMenuName = "",
  DisplayHeading = "",
  TextDescription = "",
  Content = null,
  ReturnUrl = null,
  SubMenuName = null,
}) => {
  return (
    <React.Fragment>
      <div className="container datafornow">
        <Row gutter={32}>
          <Col
            className="gutter-row breadcrubnav"
            xs={{ span: 24 }}
            md={{ span: 24 }}
            lg={{ span: 24 }}
          >
            <Breadcrumb separator={<FontAwesomeIcon icon={faAngleRight} />}>
              <Breadcrumb.Item>
                <Link to={`${routePathConstants.HOME_PATH}`}>
                  {commonConstants.HOME}
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to={`${routePathConstants.STATCOM_PATH}`}>
                  {commonConstants.UNITED_NATIONS_STATISTICAL_COMMISSION}
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link
                  to={`${routePathConstants.STATCOM_SESSION_PATH}${SessionId}`}
                >
                  {getOrdinalNum(SessionId)} Session
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                {ReturnUrl ? (
                  <Link to={ReturnUrl} style={{ color: "#5B92E5" }}>{DisplayMenuName}</Link>
                ) : (
                  DisplayMenuName
                )}
              </Breadcrumb.Item>
              
              {/* 
                                {
                                    SubMenuName ?
                                        <Breadcrumb.Item>
                                            {SubMenuName}
                                        </Breadcrumb.Item> : <></>} */}
            </Breadcrumb>
          </Col>
        </Row>
        <Row gutter={32}>
          <Col
            className="gutter-row director-statements-listings"
            xs={{ span: 24 }}
            md={{ span: 24 }}
            lg={{ span: 24 }}
          >
            <Row>
              {DisplayHeading ? (
                <Col>
                  <h2 className="mb-3">{DisplayHeading}</h2>
                </Col>
              ) : (
                <></>
              )}
            </Row>
            <Row>
              {TextDescription ? (
                <Col style={{ textAlign: "left" }}>
                  <p className="textbottommargin">{parse(TextDescription)}</p>
                </Col>
              ) : (
                <></>
              )}
            </Row>
            <Row>
              <Col span={24}>{Content}</Col>
            </Row>
          </Col>
        </Row>
      </div>
    </React.Fragment>
  );
};
