import React from "react";
import { commonConstants } from "../../../helper/Common/CommonConstants";
import { CheckNullOrEmptyValue } from "../../../script/Commonfunctions";

export function Image(props) {
  let image = !CheckNullOrEmptyValue(props.image)
    ? props.image
    : commonConstants.DEFAULT_IMAGE;
  return (
    <React.Fragment>
      <img
        src={props.externalPath ? image : commonConstants.IMAGE_PATH + image}
        alt=" "
        className={props.className}
        onClick={props.onClick}
        width={props.width}
        height={props.height}
      />
    </React.Fragment>
  );
}
// TB - use url to show webcast background images
export function ImageWebRecordings(props) {
  let image = !CheckNullOrEmptyValue(props.image)
    ? props.image
    : commonConstants.DEFAULT_IMAGE;
  return (
    <React.Fragment>
      <img
        src={props.externalPath ? image : image}
        alt=" "
        className={props.className}
        onClick={props.onClick}
      />
    </React.Fragment>
  );
}
