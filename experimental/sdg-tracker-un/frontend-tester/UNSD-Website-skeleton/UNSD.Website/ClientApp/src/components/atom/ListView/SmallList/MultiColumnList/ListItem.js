import React from "react";
import { List, Row, Col, Avatar } from "antd";
import { CustomIcon } from "../../../Icon";

export function ListItems(props) {
  const itemStyles = {
    rowGutter: props.noOfColumns == 2 ? 32 : 32,
  };
  const onTilteClick = (id) => {
    props.onTilteClick(id);
  };

  return (
    <List.Item key={props.item.title} onClick={props.onClicked}>
      <Row gutter={8}>
        <Col
          className="gutter-row text-center"
          xs={{ span: 6 }}
          md={{ span: 6 }}
          lg={{ span: 6 }}
        >
          {props.item.image && (
            <Avatar shape="square" size={128} src={props.item.image} />
          )}
          <div className="event-date">
            {props.item.column1data1} <span>{props.item.column1data2}</span>
          </div>
        </Col>
        <Col
          className="gutter-row"
          xs={{ span: 18 }}
          md={{ span: 18 }}
          lg={{ span: 18 }}
        >
          <h4 className="mb-2">
            <a onClick={() => onTilteClick(props.item.id)}>
              {props.item.title}
            </a>
          </h4>
          {props.item.dataList && (
            <div className="event-schedule">
              {props.item.dataList.map((dataItem, index) => {
                return (
                  <span className="date small-text" key={index}>
                    <CustomIcon icon={dataItem.icon} />
                    {dataItem.value}
                  </span>
                );
              })}
            </div>
          )}
        </Col>
        {props.noOfColumns == 3 && (
          <Col className="gutter-row" span={24}>
            {props.item.title}
          </Col>
        )}
      </Row>
    </List.Item>
  );
}
