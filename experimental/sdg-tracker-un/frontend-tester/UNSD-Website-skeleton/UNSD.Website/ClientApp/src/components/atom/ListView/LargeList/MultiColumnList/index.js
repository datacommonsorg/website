import React from "react";
import { List as CustomList } from "antd";
import { CustomIcon } from "../../../Icon";
import { ListItems } from "./ListItem";

export function ListView(props) {
  return (
    <React.Fragment>
      <CustomList
        header={
          <div>
            {props.headericon && <CustomIcon icon={props.headericon} />}{" "}
            {props.header}
          </div>
        }
        className={props.className}
        itemLayout="horizontal"
        dataSource={props.data}
        renderItem={(item) => (
          <ListItems item={item} noOfColumns={props.noOfColumns} />
        )}
      ></CustomList>
    </React.Fragment>
  );
}
