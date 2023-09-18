import React from "react";
import { Row, Col, Card } from "antd";
import { Image } from "../Image";

export function CardView(props) {
  const onTitleClick = (event, data) => {
    event.preventDefault();
    props.onTitleClick(data);
  };

  return (
    <Card className="shadow ant-card-border-radius mb-3">
      <Row gutter={32}>
        <Col
          className="gutter-row"
          xs={{ span: 24 }}
          md={{ span: 8 }}
          lg={{ span: 8 }}
        >
          <Image image={props.data.image} className={"img-responsive"} />
        </Col>
        <Col
          className="gutter-row pt-3"
          xs={{ span: 24 }}
          md={{ span: 16 }}
          lg={{ span: 16 }}
        >
          <h3 className="language-lists mb-3">
            <a onClick={(event) => onTitleClick(event, props.data)}>
              {props.data.title}
            </a>
            <br />
            <span className="small-text">{props.data.subTitle}</span>
          </h3>
          {props.children}
        </Col>
      </Row>
    </Card>
  );
}
