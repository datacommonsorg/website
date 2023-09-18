import React from "react";
import { Button as CustomButton } from "antd";
import { CheckNullOrEmptyValue } from "../../../script/Commonfunctions";
import { CustomIcon } from "../Icon";
//import { faExternalLinkAlt, faSearch, faSyncAlt, faUndoAlt, faPrint, faChevronLeft, faDownload } from '@fortawesome/free-solid-svg-icons';
//import { faFilePdf, faFileExcel } from '@fortawesome/free-regular-svg-icons';
//import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function Button(props) {
  return (
    <React.Fragment>
      <CustomButton
        type={props.type}
        shape={props.shape}
        onClick={props.onClick}
        className={props.className}
        htmlType={props.htmlType}
        href={props.href}
        target={props.target}
        size={props.size}
      >
        {!CheckNullOrEmptyValue(props.icon) ? (
          <CustomIcon icon={props.icon} />
        ) : null}
        {props.labelText}
      </CustomButton>
    </React.Fragment>
  );
}
