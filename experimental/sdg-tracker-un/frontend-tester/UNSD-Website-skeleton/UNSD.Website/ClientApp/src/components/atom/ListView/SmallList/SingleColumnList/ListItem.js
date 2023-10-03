import React from "react";
import { List } from "antd";
import { CustomIcon } from "../../../Icon";
import ReactHtmlParser from "react-html-parser";

export function ListItems(props) {
  return (
    <List.Item className="py-3">
      <h4 className="mb-2">
        <a href={props.item.url} target={"_blank"}>
          {ReactHtmlParser(props.item.title)}
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
    </List.Item>
  );
}
