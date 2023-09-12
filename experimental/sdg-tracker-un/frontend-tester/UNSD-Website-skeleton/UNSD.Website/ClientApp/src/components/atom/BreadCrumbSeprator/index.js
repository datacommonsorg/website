import React from "react";
import { commonConstants } from "../../../helper/Common/CommonConstants";
import { RightOutlined, LeftOutlined } from "@ant-design/icons";

export function BreadCrumbSeprator() {
  return (
    <React.Fragment>
      {window.localStorage.getItem("dir") ==
      commonConstants.BODY_DIRECTION_RIGHT ? (
        <LeftOutlined />
      ) : (
        <RightOutlined />
      )}
    </React.Fragment>
  );
}
