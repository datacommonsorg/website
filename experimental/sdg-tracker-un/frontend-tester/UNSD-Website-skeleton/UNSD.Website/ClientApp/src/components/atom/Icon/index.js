import React from "react";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { commonConstants } from "../../../helper/Common/CommonConstants";

import * as Icons from "@fortawesome/free-solid-svg-icons";

const iconList = Object.keys(Icons)
  .filter((key) => key !== "fas" && key !== "prefix")
  .map((icon) => Icons[icon]);

library.add(...iconList);

export function CustomIcon(props) {
  const getArrowSeprator = (oldicon) => {
    if (props.icon == "angle-right") {
      if (
        window.localStorage.getItem("dir") ==
        commonConstants.BODY_DIRECTION_RIGHT
      ) {
        return "angle-left";
      }
    }

    return oldicon;
  };
  let icon = getArrowSeprator(props.icon);

  return <FontAwesomeIcon icon={icon} />;
}
