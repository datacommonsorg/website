import React from "react";
import { List, Row, Col, Avatar } from "antd";

export function ListItems(props) {
  const itemStyles = {
    rowGutter: props.noOfColumns == 2 ? 24 : 32,
  };

  return (
    <List.Item className="pt-4 pb-4">
      <Row gutter={itemStyles.rowGutter}>
        <Col
          className="gutter-row mb-3"
          xs={{ span: 24 }}
          md={{ span: 5 }}
          lg={{ span: 5 }}
        >
          <Avatar shape="square" size={128} src={props.item.image} />
        </Col>
        <Col
          className="gutter-row mb-3"
          xs={{ span: 24 }}
          md={{ span: 19 }}
          lg={{ span: 19 }}
        >
          <h6>
            {props.item.title}
            <br />
            {props.item.subTitle1}
            <br />
            {props.item.subTitle2}
          </h6>
        </Col>
        {props.noOfColumns == 3 && (
          <Col className="gutter-row" span={24}>
            {props.item.description}
          </Col>
        )}
      </Row>
    </List.Item>
  );
}
