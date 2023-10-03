import React from "react";
import { Card } from "antd";

export function CardCoverImg(props) {
  return (
    <Card
      bordered={props.bordered}
      className={props.className}
      cover={props.cover}
      key={props.key}
    >
      {props.children}
    </Card>
  );
}
