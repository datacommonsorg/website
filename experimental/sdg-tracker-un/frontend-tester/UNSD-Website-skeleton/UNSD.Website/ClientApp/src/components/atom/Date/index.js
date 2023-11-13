import React from "react";
import {
  CheckNullOrEmptyValue,
  DateFormat,
} from "../../../script/Commonfunctions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";

export function Date(props) {
  return (
    <React.Fragment>
      {!CheckNullOrEmptyValue(props.date) ? (
        <span className="date">
          <span>
            <FontAwesomeIcon icon={faCalendarDay} />
          </span>{" "}
          {DateFormat(props.date)}
        </span>
      ) : null}
    </React.Fragment>
  );
}
